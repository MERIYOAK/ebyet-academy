#!/usr/bin/env node

/**
 * Progress Data Cleanup Script
 * Fixes all invalid progress entries identified in the analysis
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🧹 Progress Data Cleanup Script');
console.log('===============================\n');

// Connect to database
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to database\n');

// Use existing Progress model
const Progress = require('../models/Progress');

// Cleanup statistics
let cleanupStats = {
  totalEntries: 0,
  fixedEntries: 0,
  deletedEntries: 0,
  errors: 0,
  fixes: {
    percentageMismatch: 0,
    completionLogic: 0,
    negativeDuration: 0,
    overshootDuration: 0,
    invalidPercentage: 0,
    zeroDuration: 0
  }
};

/**
 * Calculate correct progress percentage
 */
function calculateCorrectPercentage(watchedDuration, totalDuration) {
  if (totalDuration <= 0) return 0;
  if (watchedDuration <= 0) return 0;
  
  const percentage = Math.min(100, Math.round((watchedDuration / totalDuration) * 100));
  return Math.max(0, percentage);
}

/**
 * Determine correct completion status
 */
function determineCorrectCompletion(watchedPercentage) {
  const isCompleted = watchedPercentage >= 90;
  const completionPercentage = isCompleted ? 100 : watchedPercentage;
  
  return { isCompleted, completionPercentage };
}

/**
 * Fix individual progress entry
 */
async function fixProgressEntry(entry) {
  const originalEntry = { ...entry.toObject() };
  let needsUpdate = false;
  let updateData = {};
  
  // Fix 1: Percentage calculation errors
  if (entry.totalDuration > 0) {
    const correctPercentage = calculateCorrectPercentage(entry.watchedDuration, entry.totalDuration);
    
    if (Math.abs(correctPercentage - entry.watchedPercentage) > 1) {
      updateData.watchedPercentage = correctPercentage;
      needsUpdate = true;
      cleanupStats.fixes.percentageMismatch++;
      console.log(`   🔧 Fixed percentage: ${entry.watchedPercentage}% → ${correctPercentage}%`);
    }
  }
  
  // Fix 2: Completion logic errors
  const correctCompletion = determineCorrectCompletion(updateData.watchedPercentage || entry.watchedPercentage);
  
  if (correctCompletion.isCompleted !== entry.isCompleted) {
    updateData.isCompleted = correctCompletion.isCompleted;
    needsUpdate = true;
    cleanupStats.fixes.completionLogic++;
    console.log(`   🔧 Fixed completion: ${entry.isCompleted} → ${correctCompletion.isCompleted}`);
  }
  
  if (correctCompletion.completionPercentage !== entry.completionPercentage) {
    updateData.completionPercentage = correctCompletion.completionPercentage;
    needsUpdate = true;
    cleanupStats.fixes.completionLogic++;
    console.log(`   🔧 Fixed completion percentage: ${entry.completionPercentage}% → ${correctCompletion.completionPercentage}%`);
  }
  
  // Fix 3: Negative watched duration
  if (entry.watchedDuration < 0) {
    updateData.watchedDuration = 0;
    updateData.watchedPercentage = 0;
    updateData.completionPercentage = 0;
    updateData.isCompleted = false;
    needsUpdate = true;
    cleanupStats.fixes.negativeDuration++;
    console.log(`   🔧 Fixed negative duration: ${entry.watchedDuration}s → 0s`);
  }
  
  // Fix 4: Watched duration exceeds total duration
  if (entry.totalDuration > 0 && entry.watchedDuration > entry.totalDuration * 1.1) {
    updateData.watchedDuration = entry.totalDuration;
    updateData.watchedPercentage = 100;
    updateData.completionPercentage = 100;
    updateData.isCompleted = true;
    needsUpdate = true;
    cleanupStats.fixes.overshootDuration++;
    console.log(`   🔧 Fixed overshoot: ${entry.watchedDuration}s → ${entry.totalDuration}s`);
  }
  
  // Fix 5: Invalid percentage values
  if (entry.watchedPercentage > 100 || entry.watchedPercentage < 0) {
    const correctPercentage = calculateCorrectPercentage(entry.watchedDuration, entry.totalDuration);
    updateData.watchedPercentage = correctPercentage;
    needsUpdate = true;
    cleanupStats.fixes.invalidPercentage++;
    console.log(`   🔧 Fixed invalid percentage: ${entry.watchedPercentage}% → ${correctPercentage}%`);
  }
  
  // Fix 6: Zero total duration
  if (entry.totalDuration <= 0) {
    console.log(`   ⚠️  Entry has zero/negative total duration: ${entry.totalDuration}s`);
    console.log(`   🗑️  Deleting invalid entry`);
    await Progress.findByIdAndDelete(entry._id);
    cleanupStats.deletedEntries++;
    cleanupStats.fixes.zeroDuration++;
    return;
  }
  
  // Apply fixes if needed
  if (needsUpdate) {
    try {
      await Progress.findByIdAndUpdate(entry._id, { $set: updateData });
      cleanupStats.fixedEntries++;
      console.log(`   ✅ Entry fixed successfully`);
    } catch (error) {
      console.error(`   ❌ Error fixing entry:`, error.message);
      cleanupStats.errors++;
    }
  } else {
    console.log(`   ✅ Entry is valid, no fixes needed`);
  }
}

/**
 * Main cleanup function
 */
async function cleanupProgressData() {
  console.log('🔍 Starting progress data cleanup...\n');
  
  try {
    // Get all progress entries
    const progressEntries = await Progress.find({});
    cleanupStats.totalEntries = progressEntries.length;
    
    console.log(`📊 Found ${progressEntries.length} progress entries to analyze\n`);
    
    if (progressEntries.length === 0) {
      console.log('✅ No progress entries found. Database is clean!');
      return;
    }
    
    // Process each entry
    for (let i = 0; i < progressEntries.length; i++) {
      const entry = progressEntries[i];
      console.log(`\nEntry ${i + 1}/${progressEntries.length}:`);
      console.log(`  ID: ${entry._id}`);
      console.log(`  User: ${entry.userId}`);
      console.log(`  Course: ${entry.courseId}`);
      console.log(`  Video: ${entry.videoId}`);
      console.log(`  Watched: ${entry.watchedDuration}s / ${entry.totalDuration}s`);
      console.log(`  Watched %: ${entry.watchedPercentage}%`);
      console.log(`  Completion %: ${entry.completionPercentage}%`);
      console.log(`  Is Completed: ${entry.isCompleted}`);
      
      await fixProgressEntry(entry);
    }
    
    // Generate cleanup report
    console.log('\n📋 Cleanup Report');
    console.log('=================');
    console.log(`Total entries processed: ${cleanupStats.totalEntries}`);
    console.log(`Entries fixed: ${cleanupStats.fixedEntries}`);
    console.log(`Entries deleted: ${cleanupStats.deletedEntries}`);
    console.log(`Errors encountered: ${cleanupStats.errors}`);
    
    console.log('\n🔧 Fixes Applied:');
    console.log(`  Percentage mismatches: ${cleanupStats.fixes.percentageMismatch}`);
    console.log(`  Completion logic errors: ${cleanupStats.fixes.completionLogic}`);
    console.log(`  Negative durations: ${cleanupStats.fixes.negativeDuration}`);
    console.log(`  Duration overshoots: ${cleanupStats.fixes.overshootDuration}`);
    console.log(`  Invalid percentages: ${cleanupStats.fixes.invalidPercentage}`);
    console.log(`  Zero duration entries: ${cleanupStats.fixes.zeroDuration}`);
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    await verifyCleanup();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    cleanupStats.errors++;
  }
}

/**
 * Verify that cleanup was successful
 */
async function verifyCleanup() {
  try {
    const remainingEntries = await Progress.find({});
    let verificationErrors = 0;
    
    console.log(`\nVerifying ${remainingEntries.length} remaining entries...`);
    
    for (const entry of remainingEntries) {
      // Check for remaining issues
      if (entry.watchedDuration < 0) {
        console.log(`  ❌ Still has negative duration: ${entry.watchedDuration}s`);
        verificationErrors++;
      }
      
      if (entry.totalDuration <= 0) {
        console.log(`  ❌ Still has zero/negative total duration: ${entry.totalDuration}s`);
        verificationErrors++;
      }
      
      if (entry.watchedPercentage > 100 || entry.watchedPercentage < 0) {
        console.log(`  ❌ Still has invalid percentage: ${entry.watchedPercentage}%`);
        verificationErrors++;
      }
      
      if (entry.totalDuration > 0) {
        const correctPercentage = calculateCorrectPercentage(entry.watchedDuration, entry.totalDuration);
        if (Math.abs(correctPercentage - entry.watchedPercentage) > 1) {
          console.log(`  ❌ Still has percentage mismatch: ${entry.watchedPercentage}% vs ${correctPercentage}%`);
          verificationErrors++;
        }
      }
      
      const correctCompletion = determineCorrectCompletion(entry.watchedPercentage);
      if (correctCompletion.isCompleted !== entry.isCompleted) {
        console.log(`  ❌ Still has completion logic error: ${entry.isCompleted} vs ${correctCompletion.isCompleted}`);
        verificationErrors++;
      }
    }
    
    if (verificationErrors === 0) {
      console.log('✅ Verification passed! All entries are now valid.');
    } else {
      console.log(`⚠️  Verification found ${verificationErrors} remaining issues.`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

/**
 * Create backup before cleanup
 */
async function createBackup() {
  console.log('💾 Creating backup before cleanup...');
  
  try {
    const progressEntries = await Progress.find({});
    const backupData = {
      timestamp: new Date().toISOString(),
      totalEntries: progressEntries.length,
      entries: progressEntries.map(entry => entry.toObject())
    };
    
    // Save backup to file
    const fs = await import('fs');
    const backupFileName = `progress-backup-${Date.now()}.json`;
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created: ${backupFileName}`);
    return backupFileName;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Ask for confirmation
    console.log('⚠️  WARNING: This script will modify progress data in your database.');
    console.log('   It is recommended to create a backup first.\n');
    
    // Create backup
    const backupFile = await createBackup();
    
    // Run cleanup
    await cleanupProgressData();
    
    console.log('\n🏁 Cleanup completed successfully!');
    console.log(`📁 Backup saved as: ${backupFile}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
main();
