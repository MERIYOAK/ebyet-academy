#!/usr/bin/env node

/**
 * Simple Progress Analysis
 * Analyzes progress calculation logic for bugs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Simple Progress Analysis');
console.log('==========================\n');

// Connect to database
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to database\n');

// Define a simple progress schema for analysis
const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  watchedDuration: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  watchedPercentage: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  lastWatchedAt: { type: Date, default: Date.now }
});

const Progress = mongoose.model('Progress', progressSchema);

async function analyzeProgressData() {
  console.log('📊 Analyzing Progress Data...\n');
  
  try {
    // Get progress entries
    const progressEntries = await Progress.find().limit(20);
    
    if (progressEntries.length === 0) {
      console.log('⚠️  No progress data found in database');
      console.log('   This is normal if no users have watched videos yet');
      return;
    }
    
    console.log(`📈 Found ${progressEntries.length} progress entries to analyze\n`);
    
    // Analyze each entry
    let bugs = [];
    let warnings = [];
    
    progressEntries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`);
      console.log(`  Watched: ${entry.watchedDuration}s / ${entry.totalDuration}s`);
      console.log(`  Watched %: ${entry.watchedPercentage}%`);
      console.log(`  Completion %: ${entry.completionPercentage}%`);
      console.log(`  Is Completed: ${entry.isCompleted}`);
      
      // Check for bugs
      if (entry.totalDuration > 0) {
        const calculatedPercentage = Math.round((entry.watchedDuration / entry.totalDuration) * 100);
        
        if (Math.abs(calculatedPercentage - entry.watchedPercentage) > 1) {
          const bug = {
            type: 'Percentage Mismatch',
            entry: index + 1,
            calculated: calculatedPercentage,
            stored: entry.watchedPercentage,
            details: `Calculated ${calculatedPercentage}% but stored ${entry.watchedPercentage}%`
          };
          bugs.push(bug);
          console.log(`  🐛 BUG: ${bug.details}`);
        }
      }
      
      // Check completion logic
      if (entry.watchedPercentage >= 90 && !entry.isCompleted) {
        const bug = {
          type: 'Completion Logic Error',
          entry: index + 1,
          details: `Video watched ${entry.watchedPercentage}% but not marked as completed`
        };
        bugs.push(bug);
        console.log(`  🐛 BUG: ${bug.details}`);
      }
      
      if (entry.isCompleted && entry.completionPercentage !== 100) {
        const bug = {
          type: 'Completion Percentage Error',
          entry: index + 1,
          details: `Video marked completed but completionPercentage is ${entry.completionPercentage}%`
        };
        bugs.push(bug);
        console.log(`  🐛 BUG: ${bug.details}`);
      }
      
      // Check for warnings
      if (entry.watchedDuration > entry.totalDuration && entry.totalDuration > 0) {
        const warning = {
          type: 'Duration Overshoot',
          entry: index + 1,
          details: `Watched duration (${entry.watchedDuration}s) exceeds total duration (${entry.totalDuration}s)`
        };
        warnings.push(warning);
        console.log(`  ⚠️  WARNING: ${warning.details}`);
      }
      
      if (entry.watchedPercentage > 100) {
        const warning = {
          type: 'Percentage Overflow',
          entry: index + 1,
          details: `Watched percentage exceeds 100%: ${entry.watchedPercentage}%`
        };
        warnings.push(warning);
        console.log(`  ⚠️  WARNING: ${warning.details}`);
      }
      
      console.log('');
    });
    
    // Summary
    console.log('📋 Analysis Summary:');
    console.log('===================');
    console.log(`Total entries analyzed: ${progressEntries.length}`);
    console.log(`Bugs found: ${bugs.length}`);
    console.log(`Warnings found: ${warnings.length}`);
    
    if (bugs.length > 0) {
      console.log('\n🐛 Bugs Found:');
      bugs.forEach((bug, index) => {
        console.log(`${index + 1}. ${bug.type} (Entry ${bug.entry}): ${bug.details}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.type} (Entry ${warning.entry}): ${warning.details}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing progress data:', error.message);
  }
}

async function analyzeProgressLogic() {
  console.log('\n🔍 Analyzing Progress Calculation Logic...\n');
  
  // Test the progress calculation logic from the controller
  const testScenarios = [
    { watched: 0, total: 0, description: 'Zero duration' },
    { watched: 50, total: 100, description: '50% progress' },
    { watched: 90, total: 100, description: '90% progress (should complete)' },
    { watched: 100, total: 100, description: '100% progress' },
    { watched: 150, total: 100, description: 'Overshoot' },
    { watched: -10, total: 100, description: 'Negative watched duration' }
  ];
  
  console.log('📋 Testing Progress Calculation Scenarios:');
  console.log('==========================================');
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\nScenario ${index + 1}: ${scenario.description}`);
    console.log(`  Input: ${scenario.watched}s / ${scenario.total}s`);
    
    // Simulate the logic from progressController.js
    if (scenario.total === 0) {
      console.log(`  ⚠️  WARNING: Division by zero possible`);
      console.log(`  🐛 BUG: No handling for zero total duration`);
    } else if (scenario.watched < 0) {
      console.log(`  ⚠️  WARNING: Negative watched duration not validated`);
      console.log(`  🐛 BUG: Should reject negative values`);
    } else {
      const percentage = Math.min(100, Math.round((scenario.watched / scenario.total) * 100));
      const shouldComplete = percentage >= 90;
      
      console.log(`  Calculated percentage: ${percentage}%`);
      console.log(`  Should complete: ${shouldComplete}`);
      
      if (scenario.watched > scenario.total) {
        console.log(`  ⚠️  WARNING: Watched exceeds total, but capped at 100%`);
      }
    }
  });
}

async function analyzeCourseProgressLogic() {
  console.log('\n📚 Analyzing Course Progress Logic...\n');
  
  console.log('🔍 Current Course Progress Calculation:');
  console.log('======================================');
  
  console.log('Current logic in getOverallCourseProgress():');
  console.log('1. Get all progress entries for a course');
  console.log('2. Count completed videos (isCompleted = true)');
  console.log('3. Sum all completionPercentage values');
  console.log('4. Calculate: totalCompletionPercentage / totalVideos');
  
  console.log('\n🐛 Potential Issues:');
  console.log('===================');
  
  console.log('1. COMPLETION PERCENTAGE ISSUE:');
  console.log('   - Uses completionPercentage from individual videos');
  console.log('   - If a video is 90% complete, it contributes 90% to course progress');
  console.log('   - But the video might not be marked as completed yet');
  console.log('   - This could lead to inflated course progress');
  
  console.log('\n2. INCONSISTENT COMPLETION LOGIC:');
  console.log('   - Videos marked complete at 90% watched');
  console.log('   - But completionPercentage might not be 100%');
  console.log('   - Course progress calculation might be inconsistent');
  
  console.log('\n3. RECOMMENDED FIX:');
  console.log('   - Use isCompleted flag for course progress calculation');
  console.log('   - Course progress = (completed videos / total videos) * 100');
  console.log('   - This ensures consistency between video and course completion');
}

async function generateRecommendations() {
  console.log('\n🔧 Recommendations for Fixing Progress Bugs:');
  console.log('============================================');
  
  console.log('\n1. FIX COMPLETION LOGIC:');
  console.log('   - Ensure completionPercentage = 100 when isCompleted = true');
  console.log('   - Use atomic operations for completion updates');
  console.log('   - Add validation to prevent inconsistent states');
  
  console.log('\n2. IMPROVE COURSE PROGRESS CALCULATION:');
  console.log('   - Change from completionPercentage sum to completed videos count');
  console.log('   - Course progress = (completed videos / total videos) * 100');
  console.log('   - This is more intuitive and consistent');
  
  console.log('\n3. ADD DATA VALIDATION:');
  console.log('   - Validate watched duration >= 0');
  console.log('   - Handle zero total duration gracefully');
  console.log('   - Cap percentage at 100%');
  
  console.log('\n4. IMPROVE USER EXPERIENCE:');
  console.log('   - Reduce progress update throttle from 30s to 5-10s');
  console.log('   - Add retry mechanism for failed updates');
  console.log('   - Show real-time progress updates');
  
  console.log('\n5. ADD MONITORING:');
  console.log('   - Log progress calculation errors');
  console.log('   - Monitor for data inconsistencies');
  console.log('   - Add alerts for unusual progress patterns');
}

// Run the analysis
async function runAnalysis() {
  try {
    await analyzeProgressData();
    await analyzeProgressLogic();
    await analyzeCourseProgressLogic();
    await generateRecommendations();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Analysis completed!');
  }
}

runAnalysis();
