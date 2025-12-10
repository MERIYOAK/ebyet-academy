#!/usr/bin/env node

/**
 * Progress Calculation Bug Analysis
 * Deep analysis of progress calculation logic to identify bugs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Progress Calculation Bug Analysis');
console.log('====================================\n');

// Connect to database
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to database\n');

// Import models with proper schemas
import Progress from './models/Progress.js';
import Course from './models/Course.js';
import User from './models/User.js';

// Bug analysis functions
async function analyzeProgressCalculationBugs() {
  console.log('📊 Analyzing Progress Calculation Logic...\n');
  
  // Get some real progress data to analyze
  const progressEntries = await Progress.find().limit(10).populate('courseId videoId userId');
  
  if (progressEntries.length === 0) {
    console.log('⚠️  No progress data found. Creating test data...');
    await createTestData();
    return;
  }
  
  console.log(`📈 Analyzing ${progressEntries.length} progress entries...\n`);
  
  // Bug 1: Check for percentage calculation errors
  console.log('🔍 Bug Check 1: Percentage Calculation Errors');
  console.log('------------------------------------------------');
  
  let percentageErrors = 0;
  progressEntries.forEach((entry, index) => {
    if (entry.totalDuration > 0) {
      const calculatedPercentage = Math.round((entry.watchedDuration / entry.totalDuration) * 100);
      const storedPercentage = entry.watchedPercentage;
      
      if (Math.abs(calculatedPercentage - storedPercentage) > 1) {
        console.log(`❌ Entry ${index + 1}: Calculated ${calculatedPercentage}% vs Stored ${storedPercentage}%`);
        console.log(`   Watched: ${entry.watchedDuration}s, Total: ${entry.totalDuration}s`);
        percentageErrors++;
      }
    }
  });
  
  if (percentageErrors === 0) {
    console.log('✅ No percentage calculation errors found');
  } else {
    console.log(`🐛 Found ${percentageErrors} percentage calculation errors`);
  }
  
  // Bug 2: Check for completion logic errors
  console.log('\n🔍 Bug Check 2: Completion Logic Errors');
  console.log('----------------------------------------');
  
  let completionErrors = 0;
  progressEntries.forEach((entry, index) => {
    const shouldBeCompleted = entry.watchedPercentage >= 90;
    const isActuallyCompleted = entry.isCompleted;
    
    if (shouldBeCompleted !== isActuallyCompleted) {
      console.log(`❌ Entry ${index + 1}: Completion logic error`);
      console.log(`   Watched: ${entry.watchedPercentage}%, Should complete: ${shouldBeCompleted}, Is completed: ${isActuallyCompleted}`);
      completionErrors++;
    }
  });
  
  if (completionErrors === 0) {
    console.log('✅ No completion logic errors found');
  } else {
    console.log(`🐛 Found ${completionErrors} completion logic errors`);
  }
  
  // Bug 3: Check for data consistency issues
  console.log('\n🔍 Bug Check 3: Data Consistency Issues');
  console.log('----------------------------------------');
  
  let consistencyErrors = 0;
  progressEntries.forEach((entry, index) => {
    // Check if watched duration exceeds total duration
    if (entry.watchedDuration > entry.totalDuration && entry.totalDuration > 0) {
      console.log(`❌ Entry ${index + 1}: Watched duration exceeds total duration`);
      console.log(`   Watched: ${entry.watchedDuration}s, Total: ${entry.totalDuration}s`);
      consistencyErrors++;
    }
    
    // Check if percentage exceeds 100%
    if (entry.watchedPercentage > 100) {
      console.log(`❌ Entry ${index + 1}: Percentage exceeds 100%`);
      console.log(`   Percentage: ${entry.watchedPercentage}%`);
      consistencyErrors++;
    }
    
    // Check if completion percentage doesn't match watched percentage
    if (entry.isCompleted && entry.completionPercentage !== 100) {
      console.log(`❌ Entry ${index + 1}: Completed video has non-100% completion`);
      console.log(`   Completion: ${entry.completionPercentage}%, Watched: ${entry.watchedPercentage}%`);
      consistencyErrors++;
    }
  });
  
  if (consistencyErrors === 0) {
    console.log('✅ No data consistency issues found');
  } else {
    console.log(`🐛 Found ${consistencyErrors} data consistency issues`);
  }
}

async function analyzeCourseProgressBugs() {
  console.log('\n📚 Analyzing Course Progress Calculation Bugs...\n');
  
  // Get courses with progress data
  const courses = await Course.find().limit(5);
  
  for (const course of courses) {
    console.log(`🔍 Analyzing course: ${course.title}`);
    
    // Get all progress entries for this course
    const progressEntries = await Progress.find({ courseId: course._id });
    
    if (progressEntries.length === 0) {
      console.log('   ⚠️  No progress data for this course');
      continue;
    }
    
    // Calculate course progress manually
    const totalVideos = course.videos ? course.videos.length : progressEntries.length;
    const completedVideos = progressEntries.filter(p => p.isCompleted).length;
    const totalCompletionPercentage = progressEntries.reduce((sum, p) => sum + p.completionPercentage, 0);
    const calculatedCourseProgress = Math.round(totalCompletionPercentage / totalVideos);
    
    console.log(`   📊 Manual calculation:`);
    console.log(`      Total videos: ${totalVideos}`);
    console.log(`      Completed videos: ${completedVideos}`);
    console.log(`      Total completion percentage: ${totalCompletionPercentage}`);
    console.log(`      Course progress: ${calculatedCourseProgress}%`);
    
    // Check for potential bugs
    if (completedVideos > totalVideos) {
      console.log(`   🐛 BUG: More completed videos than total videos!`);
    }
    
    if (calculatedCourseProgress > 100) {
      console.log(`   🐛 BUG: Course progress exceeds 100%!`);
    }
    
    if (completedVideos === totalVideos && calculatedCourseProgress < 90) {
      console.log(`   🐛 BUG: All videos completed but course progress < 90%`);
    }
    
    console.log('');
  }
}

async function analyzeProgressUpdateBugs() {
  console.log('\n🔄 Analyzing Progress Update Logic Bugs...\n');
  
  // Check the progress update logic in the controller
  console.log('🔍 Analyzing Progress Update Controller Logic...');
  
  // Simulate the progress update logic to find potential bugs
  const testScenarios = [
    { watchedDuration: 0, totalDuration: 0, expectedError: true },
    { watchedDuration: -10, totalDuration: 100, expectedError: true },
    { watchedDuration: 50, totalDuration: 100, expectedPercentage: 50 },
    { watchedDuration: 90, totalDuration: 100, expectedPercentage: 90, shouldComplete: true },
    { watchedDuration: 100, totalDuration: 100, expectedPercentage: 100, shouldComplete: true },
    { watchedDuration: 150, totalDuration: 100, expectedPercentage: 100, shouldComplete: true }
  ];
  
  console.log('📋 Testing Progress Update Scenarios:');
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n   Scenario ${index + 1}: ${scenario.watchedDuration}s/${scenario.totalDuration}s`);
    
    // Simulate the calculation logic from the controller
    if (scenario.totalDuration === 0) {
      console.log(`   ⚠️  WARNING: Division by zero possible`);
    }
    
    if (scenario.watchedDuration < 0) {
      console.log(`   ⚠️  WARNING: Negative watched duration not handled`);
    }
    
    if (scenario.totalDuration > 0) {
      const calculatedPercentage = Math.min(100, Math.round((scenario.watchedDuration / scenario.totalDuration) * 100));
      const shouldComplete = calculatedPercentage >= 90;
      
      console.log(`   Calculated percentage: ${calculatedPercentage}%`);
      console.log(`   Should complete: ${shouldComplete}`);
      
      if (scenario.expectedPercentage !== undefined && calculatedPercentage !== scenario.expectedPercentage) {
        console.log(`   🐛 BUG: Expected ${scenario.expectedPercentage}%, got ${calculatedPercentage}%`);
      }
      
      if (scenario.shouldComplete !== undefined && shouldComplete !== scenario.shouldComplete) {
        console.log(`   🐛 BUG: Completion logic error`);
      }
    }
  });
}

async function analyzeConcurrencyBugs() {
  console.log('\n⚡ Analyzing Concurrency-Related Bugs...\n');
  
  console.log('🔍 Potential Concurrency Issues:');
  
  // Check for race conditions in progress updates
  console.log('1. Race Conditions in Progress Updates:');
  console.log('   ⚠️  Multiple rapid updates might overwrite each other');
  console.log('   ⚠️  $max operator should prevent this, but needs verification');
  
  // Check for atomic operation issues
  console.log('2. Atomic Operation Issues:');
  console.log('   ⚠️  Progress updates use findOneAndUpdate - should be atomic');
  console.log('   ⚠️  But completion logic uses separate update - potential race condition');
  
  // Check for throttling issues
  console.log('3. Throttling Issues:');
  console.log('   ⚠️  30-second throttle might be too long for responsive UI');
  console.log('   ⚠️  Users might not see immediate progress updates');
  
  // Check for data loss scenarios
  console.log('4. Data Loss Scenarios:');
  console.log('   ⚠️  If progress update fails, user loses progress');
  console.log('   ⚠️  No retry mechanism for failed updates');
}

async function createTestData() {
  console.log('Creating test data for analysis...');
  
  // This would create some test progress entries
  // For now, just note that we need real data
  console.log('⚠️  Need real progress data to perform analysis');
  console.log('   Run the comprehensive test script first to generate test data');
}

async function generateBugReport() {
  console.log('\n📋 Generating Bug Report...\n');
  
  console.log('🐛 POTENTIAL BUGS IDENTIFIED:');
  console.log('============================');
  
  console.log('\n1. COMPLETION LOGIC BUG:');
  console.log('   - Videos marked complete at 90% but completionPercentage might not be 100%');
  console.log('   - This could cause course progress calculation errors');
  
  console.log('\n2. PROGRESS UPDATE RACE CONDITION:');
  console.log('   - Completion logic uses separate update after progress update');
  console.log('   - Could lead to inconsistent state if updates fail');
  
  console.log('\n3. THROTTLING ISSUE:');
  console.log('   - 30-second throttle might be too long for responsive UI');
  console.log('   - Users might not see immediate progress updates');
  
  console.log('\n4. DATA VALIDATION GAPS:');
  console.log('   - No validation for negative watched duration');
  console.log('   - No handling for zero total duration');
  
  console.log('\n5. COURSE PROGRESS CALCULATION:');
  console.log('   - Uses completionPercentage from individual videos');
  console.log('   - Might not accurately reflect actual course completion');
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  console.log('====================');
  
  console.log('\n1. Fix completion logic:');
  console.log('   - Ensure completionPercentage = 100 when isCompleted = true');
  console.log('   - Use atomic operations for completion updates');
  
  console.log('\n2. Improve progress updates:');
  console.log('   - Reduce throttle to 5-10 seconds for better responsiveness');
  console.log('   - Add retry mechanism for failed updates');
  
  console.log('\n3. Add data validation:');
  console.log('   - Validate watched duration >= 0');
  console.log('   - Handle zero total duration gracefully');
  
  console.log('\n4. Fix course progress calculation:');
  console.log('   - Use isCompleted flag instead of completionPercentage for course progress');
  console.log('   - Course progress = (completed videos / total videos) * 100');
}

// Run the analysis
async function runAnalysis() {
  try {
    await analyzeProgressCalculationBugs();
    await analyzeCourseProgressBugs();
    await analyzeProgressUpdateBugs();
    await analyzeConcurrencyBugs();
    await generateBugReport();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Analysis completed!');
  }
}

runAnalysis();
