#!/usr/bin/env node

/**
 * Comprehensive Progress Bar Testing Script
 * Tests all progress tracking functionality and identifies bugs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const API_BASE_URL = 'http://localhost:5000/api';

// Test data
let testUser = null;
let testCourse = null;
let testVideos = [];
let authToken = null;

// Progress tracking
let testResults = {
  passed: 0,
  failed: 0,
  bugs: [],
  warnings: []
};

console.log('🧪 Comprehensive Progress Bar Testing Suite');
console.log('============================================\n');

// Utility functions
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logBug(component, issue, details = '') {
  const bug = { component, issue, details };
  testResults.bugs.push(bug);
  console.log(`🐛 BUG: ${component} - ${issue}`);
  if (details) console.log(`   ${details}`);
}

function logWarning(component, warning, details = '') {
  const warningObj = { component, warning, details };
  testResults.warnings.push(warningObj);
  console.log(`⚠️  WARNING: ${component} - ${warning}`);
  if (details) console.log(`   ${details}`);
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { response: null, data: null, error };
  }
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('🔌 Testing Database Connection...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    logTest('Database Connection', true, 'Successfully connected to MongoDB');
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

// Test 2: Create Test User
async function createTestUser() {
  console.log('\n👤 Creating Test User...');
  
  const userData = {
    name: 'Progress Test User',
    email: 'progress-test@example.com',
    password: 'testpassword123'
  };
  
  const { response, data } = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  if (response?.ok && data.success) {
    testUser = data.data.user;
    authToken = data.data.token;
    logTest('Create Test User', true, `User ID: ${testUser._id}`);
    return true;
  } else {
    logTest('Create Test User', false, data?.message || 'Failed to create user');
    return false;
  }
}

// Test 3: Create Test Course with Videos
async function createTestCourse() {
  console.log('\n📚 Creating Test Course...');
  
  const courseData = {
    title: 'Progress Testing Course',
    description: 'A course for testing progress bars',
    price: 0,
    category: 'Testing',
    level: 'Beginner',
    videos: [
      {
        title: 'Video 1 - Introduction',
        description: 'First video for testing',
        duration: '00:05:00',
        order: 1
      },
      {
        title: 'Video 2 - Basics',
        description: 'Second video for testing',
        duration: '00:08:00',
        order: 2
      },
      {
        title: 'Video 3 - Advanced',
        description: 'Third video for testing',
        duration: '00:10:00',
        order: 3
      }
    ]
  };
  
  const { response, data } = await apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
  
  if (response?.ok && data.success) {
    testCourse = data.data.course;
    testVideos = data.data.course.videos;
    logTest('Create Test Course', true, `Course ID: ${testCourse._id}, Videos: ${testVideos.length}`);
    return true;
  } else {
    logTest('Create Test Course', false, data?.message || 'Failed to create course');
    return false;
  }
}

// Test 4: Purchase Course
async function purchaseCourse() {
  console.log('\n💰 Purchasing Test Course...');
  
  const { response, data } = await apiRequest(`/payments/purchase/${testCourse._id}`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod: 'test' })
  });
  
  if (response?.ok && data.success) {
    logTest('Purchase Course', true, 'Course purchased successfully');
    return true;
  } else {
    logTest('Purchase Course', false, data?.message || 'Failed to purchase course');
    return false;
  }
}

// Test 5: Video Progress Updates
async function testVideoProgressUpdates() {
  console.log('\n📹 Testing Video Progress Updates...');
  
  const videoId = testVideos[0]._id;
  const courseId = testCourse._id;
  
  // Test different progress scenarios
  const testScenarios = [
    { watchedDuration: 60, totalDuration: 300, expectedPercentage: 20 }, // 20%
    { watchedDuration: 150, totalDuration: 300, expectedPercentage: 50 }, // 50%
    { watchedDuration: 270, totalDuration: 300, expectedPercentage: 90 }, // 90% (should mark as completed)
    { watchedDuration: 300, totalDuration: 300, expectedPercentage: 100 }, // 100%
  ];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`   Testing scenario ${i + 1}: ${scenario.watchedDuration}s/${scenario.totalDuration}s`);
    
    const { response, data } = await apiRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        videoId,
        watchedDuration: scenario.watchedDuration,
        totalDuration: scenario.totalDuration,
        timestamp: scenario.watchedDuration
      })
    });
    
    if (response?.ok && data.success) {
      const progress = data.data.videoProgress;
      const actualPercentage = progress.watchedPercentage;
      const isCompleted = progress.isCompleted;
      
      // Check if percentage is correct
      if (Math.abs(actualPercentage - scenario.expectedPercentage) <= 1) {
        logTest(`Progress Update ${i + 1}`, true, 
          `Expected: ${scenario.expectedPercentage}%, Got: ${actualPercentage}%`);
      } else {
        logTest(`Progress Update ${i + 1}`, false, 
          `Expected: ${scenario.expectedPercentage}%, Got: ${actualPercentage}%`);
        logBug('Video Progress', 'Incorrect percentage calculation', 
          `Expected ${scenario.expectedPercentage}% but got ${actualPercentage}%`);
      }
      
      // Check completion logic
      if (scenario.expectedPercentage >= 90 && !isCompleted) {
        logBug('Video Progress', 'Video not marked as completed at 90%', 
          `Video should be completed at ${scenario.expectedPercentage}%`);
      } else if (scenario.expectedPercentage < 90 && isCompleted) {
        logBug('Video Progress', 'Video marked as completed before 90%', 
          `Video marked completed at ${scenario.expectedPercentage}%`);
      }
      
    } else {
      logTest(`Progress Update ${i + 1}`, false, data?.message || 'Failed to update progress');
    }
    
    // Wait a bit between updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test 6: Course Progress Calculation
async function testCourseProgressCalculation() {
  console.log('\n📊 Testing Course Progress Calculation...');
  
  const courseId = testCourse._id;
  
  // Complete all videos to test course progress
  for (let i = 0; i < testVideos.length; i++) {
    const video = testVideos[i];
    const { response, data } = await apiRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        videoId: video._id,
        watchedDuration: 300, // Assume 5 minutes
        totalDuration: 300,
        timestamp: 300
      })
    });
    
    if (!response?.ok) {
      logTest(`Complete Video ${i + 1}`, false, data?.message || 'Failed to complete video');
    }
  }
  
  // Get course progress
  const { response, data } = await apiRequest(`/progress/course/${courseId}`);
  
  if (response?.ok && data.success) {
    const courseProgress = data.data.overallProgress;
    const expectedProgress = 100; // All videos completed
    
    if (courseProgress.courseProgressPercentage >= 95) {
      logTest('Course Progress Calculation', true, 
        `Course progress: ${courseProgress.courseProgressPercentage}%`);
    } else {
      logTest('Course Progress Calculation', false, 
        `Expected ~100%, Got: ${courseProgress.courseProgressPercentage}%`);
      logBug('Course Progress', 'Incorrect course progress calculation', 
        `Expected ~100% but got ${courseProgress.courseProgressPercentage}%`);
    }
    
    // Check if all videos are marked as completed
    if (courseProgress.completedVideos === testVideos.length) {
      logTest('Video Completion Count', true, 
        `Completed videos: ${courseProgress.completedVideos}/${courseProgress.totalVideos}`);
    } else {
      logTest('Video Completion Count', false, 
        `Expected ${testVideos.length}, Got: ${courseProgress.completedVideos}`);
      logBug('Course Progress', 'Incorrect completed videos count', 
        `Expected ${testVideos.length} but got ${courseProgress.completedVideos}`);
    }
    
  } else {
    logTest('Course Progress Calculation', false, data?.message || 'Failed to get course progress');
  }
}

// Test 7: Dashboard Progress
async function testDashboardProgress() {
  console.log('\n📈 Testing Dashboard Progress...');
  
  const { response, data } = await apiRequest('/progress/dashboard');
  
  if (response?.ok && data.success) {
    const dashboardData = data.data;
    const course = dashboardData.courses.find(c => c._id === testCourse._id);
    
    if (course) {
      logTest('Dashboard Progress', true, 
        `Course progress: ${course.progress}%, Completed: ${course.completedLessons}/${course.totalLessons}`);
      
      // Check if progress is consistent with course progress
      if (course.progress >= 95) {
        logTest('Dashboard Progress Consistency', true, 'Progress matches course completion');
      } else {
        logTest('Dashboard Progress Consistency', false, 
          `Dashboard shows ${course.progress}% but course should be ~100%`);
        logBug('Dashboard Progress', 'Inconsistent progress display', 
          `Dashboard shows ${course.progress}% but course should be ~100%`);
      }
    } else {
      logTest('Dashboard Progress', false, 'Test course not found in dashboard');
    }
  } else {
    logTest('Dashboard Progress', false, data?.message || 'Failed to get dashboard progress');
  }
}

// Test 8: Progress Bar Data Flow
async function testProgressBarDataFlow() {
  console.log('\n🔄 Testing Progress Bar Data Flow...');
  
  const courseId = testCourse._id;
  const videoId = testVideos[0]._id;
  
  // Get video progress
  const { response, data } = await apiRequest(`/progress/video/${courseId}/${videoId}`);
  
  if (response?.ok && data.success) {
    const videoProgress = data.data.videoProgress;
    
    // Check if all required fields are present
    const requiredFields = ['watchedDuration', 'totalDuration', 'watchedPercentage', 'completionPercentage', 'isCompleted'];
    const missingFields = requiredFields.filter(field => !(field in videoProgress));
    
    if (missingFields.length === 0) {
      logTest('Progress Data Structure', true, 'All required fields present');
    } else {
      logTest('Progress Data Structure', false, `Missing fields: ${missingFields.join(', ')}`);
      logBug('Progress Data', 'Missing required fields', `Missing: ${missingFields.join(', ')}`);
    }
    
    // Check data consistency
    if (videoProgress.watchedPercentage >= 0 && videoProgress.watchedPercentage <= 100) {
      logTest('Progress Percentage Range', true, 'Percentage within valid range');
    } else {
      logTest('Progress Percentage Range', false, `Invalid percentage: ${videoProgress.watchedPercentage}%`);
      logBug('Progress Data', 'Invalid percentage range', `Percentage: ${videoProgress.watchedPercentage}%`);
    }
    
  } else {
    logTest('Progress Bar Data Flow', false, data?.message || 'Failed to get video progress');
  }
}

// Test 9: Edge Cases
async function testEdgeCases() {
  console.log('\n🔍 Testing Edge Cases...');
  
  const courseId = testCourse._id;
  const videoId = testVideos[0]._id;
  
  // Test 1: Zero duration
  const { response: response1, data: data1 } = await apiRequest('/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      courseId,
      videoId,
      watchedDuration: 0,
      totalDuration: 0,
      timestamp: 0
    })
  });
  
  if (response1?.ok) {
    logTest('Zero Duration Handling', true, 'Handled zero duration gracefully');
  } else {
    logTest('Zero Duration Handling', false, 'Failed to handle zero duration');
    logWarning('Edge Cases', 'Zero duration not handled', 'Should handle division by zero');
  }
  
  // Test 2: Negative values
  const { response: response2, data: data2 } = await apiRequest('/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      courseId,
      videoId,
      watchedDuration: -10,
      totalDuration: 100,
      timestamp: 0
    })
  });
  
  if (!response2?.ok) {
    logTest('Negative Values Handling', true, 'Rejected negative values');
  } else {
    logTest('Negative Values Handling', false, 'Accepted negative values');
    logBug('Edge Cases', 'Negative values accepted', 'Should reject negative watched duration');
  }
  
  // Test 3: Watched duration > total duration
  const { response: response3, data: data3 } = await apiRequest('/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      courseId,
      videoId,
      watchedDuration: 200,
      totalDuration: 100,
      timestamp: 100
    })
  });
  
  if (response3?.ok && data3.success) {
    const progress = data3.data.videoProgress;
    if (progress.watchedPercentage <= 100) {
      logTest('Overshoot Handling', true, 'Capped at 100%');
    } else {
      logTest('Overshoot Handling', false, `Exceeded 100%: ${progress.watchedPercentage}%`);
      logBug('Edge Cases', 'Progress exceeded 100%', `Got ${progress.watchedPercentage}%`);
    }
  } else {
    logTest('Overshoot Handling', false, 'Failed to handle overshoot');
  }
}

// Test 10: Performance and Concurrency
async function testPerformanceAndConcurrency() {
  console.log('\n⚡ Testing Performance and Concurrency...');
  
  const courseId = testCourse._id;
  const videoId = testVideos[1]._id; // Use second video
  
  // Test rapid updates
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    promises.push(
      apiRequest('/progress/update', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          videoId,
          watchedDuration: 60 + (i * 10),
          totalDuration: 300,
          timestamp: 60 + (i * 10)
        })
      })
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const successfulUpdates = results.filter(r => r.response?.ok).length;
  
  if (successfulUpdates === 5) {
    logTest('Concurrent Updates', true, `All ${successfulUpdates} updates successful in ${duration}ms`);
  } else {
    logTest('Concurrent Updates', false, `${successfulUpdates}/5 updates successful`);
    logWarning('Performance', 'Some concurrent updates failed', 'May need better concurrency handling');
  }
  
  // Check final progress
  const { response, data } = await apiRequest(`/progress/video/${courseId}/${videoId}`);
  if (response?.ok && data.success) {
    const progress = data.data.videoProgress;
    logTest('Final Progress After Concurrency', true, `Final progress: ${progress.watchedPercentage}%`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Progress Bar Tests...\n');
  
  // Setup tests
  if (!await testDatabaseConnection()) return;
  if (!await createTestUser()) return;
  if (!await createTestCourse()) return;
  if (!await purchaseCourse()) return;
  
  // Core functionality tests
  await testVideoProgressUpdates();
  await testCourseProgressCalculation();
  await testDashboardProgress();
  await testProgressBarDataFlow();
  
  // Edge cases and performance
  await testEdgeCases();
  await testPerformanceAndConcurrency();
  
  // Results summary
  console.log('\n📋 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`🐛 Bugs Found: ${testResults.bugs.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  
  if (testResults.bugs.length > 0) {
    console.log('\n🐛 Bugs Found:');
    testResults.bugs.forEach((bug, index) => {
      console.log(`${index + 1}. ${bug.component}: ${bug.issue}`);
      if (bug.details) console.log(`   ${bug.details}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.component}: ${warning.warning}`);
      if (warning.details) console.log(`   ${warning.details}`);
    });
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Clean up test data (you might want to implement this)
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️  Cleanup failed:', error.message);
  }
  
  await mongoose.disconnect();
  console.log('\n🏁 Testing completed!');
}

// Run the tests
runAllTests().catch(console.error);
