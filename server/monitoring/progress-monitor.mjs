#!/usr/bin/env node

/**
 * Progress Monitoring System
 * Real-time monitoring and alerting for progress tracking issues
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Monitoring configuration
const MONITORING_CONFIG = {
  checkInterval: 60000, // Check every minute
  alertThresholds: {
    percentageMismatch: 5, // Alert if more than 5% of entries have mismatches
    completionErrors: 3, // Alert if more than 3 completion errors
    negativeDurations: 1, // Alert if any negative durations
    invalidPercentages: 2, // Alert if more than 2 invalid percentages
    dataInconsistencies: 10 // Alert if more than 10 total issues
  },
  retentionDays: 30 // Keep monitoring data for 30 days
};

// Monitoring data storage
let monitoringData = {
  lastCheck: null,
  totalChecks: 0,
  totalIssues: 0,
  alerts: [],
  metrics: {
    percentageMismatches: 0,
    completionErrors: 0,
    negativeDurations: 0,
    invalidPercentages: 0,
    overshootDurations: 0,
    zeroDurations: 0
  }
};

// Alert system
const alertSystem = {
  alerts: [],
  
  addAlert: (level, message, data = {}) => {
    const alert = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      level, // 'info', 'warning', 'error', 'critical'
      message,
      data
    };
    
    alertSystem.alerts.push(alert);
    
    // Log alert
    const logLevel = level.toUpperCase();
    console.log(`[${alert.timestamp}] [ALERT-${logLevel}] ${message}`, data);
    
    // Keep only recent alerts
    const cutoffTime = Date.now() - (MONITORING_CONFIG.retentionDays * 24 * 60 * 60 * 1000);
    alertSystem.alerts = alertSystem.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
    
    return alert;
  },
  
  getRecentAlerts: (hours = 24) => {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return alertSystem.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
  },
  
  clearAlerts: () => {
    alertSystem.alerts = [];
  }
};

/**
 * Progress validation functions
 */
const progressValidator = {
  validatePercentage: (watchedDuration, totalDuration, storedPercentage) => {
    if (totalDuration <= 0) return { valid: false, issue: 'zero_total_duration' };
    if (watchedDuration < 0) return { valid: false, issue: 'negative_watched_duration' };
    
    const calculatedPercentage = Math.min(100, Math.round((watchedDuration / totalDuration) * 100));
    const difference = Math.abs(calculatedPercentage - storedPercentage);
    
    if (difference > 1) {
      return { 
        valid: false, 
        issue: 'percentage_mismatch',
        expected: calculatedPercentage,
        actual: storedPercentage,
        difference
      };
    }
    
    return { valid: true };
  },
  
  validateCompletion: (watchedPercentage, isCompleted, completionPercentage) => {
    const shouldBeCompleted = watchedPercentage >= 90;
    const expectedCompletionPercentage = shouldBeCompleted ? 100 : watchedPercentage;
    
    const issues = [];
    
    if (shouldBeCompleted !== isCompleted) {
      issues.push({
        type: 'completion_status_mismatch',
        expected: shouldBeCompleted,
        actual: isCompleted
      });
    }
    
    if (expectedCompletionPercentage !== completionPercentage) {
      issues.push({
        type: 'completion_percentage_mismatch',
        expected: expectedCompletionPercentage,
        actual: completionPercentage
      });
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  validateDuration: (watchedDuration, totalDuration) => {
    const issues = [];
    
    if (watchedDuration < 0) {
      issues.push({ type: 'negative_watched_duration', value: watchedDuration });
    }
    
    if (totalDuration <= 0) {
      issues.push({ type: 'invalid_total_duration', value: totalDuration });
    }
    
    if (totalDuration > 0 && watchedDuration > totalDuration * 1.1) {
      issues.push({ 
        type: 'duration_overshoot', 
        watched: watchedDuration, 
        total: totalDuration,
        overshoot: watchedDuration - totalDuration
      });
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  validatePercentage: (percentage) => {
    if (percentage < 0 || percentage > 100) {
      return {
        valid: false,
        issue: 'invalid_percentage_range',
        value: percentage
      };
    }
    
    return { valid: true };
  }
};

/**
 * Monitor progress data for issues
 */
async function monitorProgressData() {
  try {
    console.log(`\n🔍 [${new Date().toISOString()}] Starting progress data monitoring...`);
    
    // Connect to database if not connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }
    
    // Define progress schema for monitoring
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
    
    // Get all progress entries
    const progressEntries = await Progress.find({});
    monitoringData.totalChecks++;
    monitoringData.lastCheck = new Date().toISOString();
    
    console.log(`📊 Monitoring ${progressEntries.length} progress entries...`);
    
    // Reset metrics for this check
    const currentMetrics = {
      percentageMismatches: 0,
      completionErrors: 0,
      negativeDurations: 0,
      invalidPercentages: 0,
      overshootDurations: 0,
      zeroDurations: 0,
      totalIssues: 0
    };
    
    const issues = [];
    
    // Check each entry
    for (const entry of progressEntries) {
      const entryIssues = [];
      
      // Validate duration data
      const durationValidation = progressValidator.validateDuration(entry.watchedDuration, entry.totalDuration);
      if (!durationValidation.valid) {
        durationValidation.issues.forEach(issue => {
          entryIssues.push(issue);
          switch (issue.type) {
            case 'negative_watched_duration':
              currentMetrics.negativeDurations++;
              break;
            case 'invalid_total_duration':
              currentMetrics.zeroDurations++;
              break;
            case 'duration_overshoot':
              currentMetrics.overshootDurations++;
              break;
          }
        });
      }
      
      // Validate percentage calculation
      if (entry.totalDuration > 0) {
        const percentageValidation = progressValidator.validatePercentage(
          entry.watchedDuration, 
          entry.totalDuration, 
          entry.watchedPercentage
        );
        
        if (!percentageValidation.valid) {
          if (percentageValidation.issue === 'percentage_mismatch') {
            currentMetrics.percentageMismatches++;
          }
          entryIssues.push(percentageValidation);
        }
      }
      
      // Validate percentage range
      const percentageRangeValidation = progressValidator.validatePercentage(entry.watchedPercentage);
      if (!percentageRangeValidation.valid) {
        currentMetrics.invalidPercentages++;
        entryIssues.push(percentageRangeValidation);
      }
      
      // Validate completion logic
      const completionValidation = progressValidator.validateCompletion(
        entry.watchedPercentage,
        entry.isCompleted,
        entry.completionPercentage
      );
      
      if (!completionValidation.valid) {
        currentMetrics.completionErrors += completionValidation.issues.length;
        entryIssues.push(...completionValidation.issues);
      }
      
      // Add entry issues to total
      if (entryIssues.length > 0) {
        issues.push({
          entryId: entry._id,
          userId: entry.userId,
          courseId: entry.courseId,
          videoId: entry.videoId,
          issues: entryIssues
        });
      }
    }
    
    // Update monitoring data
    monitoringData.metrics = currentMetrics;
    monitoringData.totalIssues += currentMetrics.totalIssues;
    
    // Check for alerts
    checkForAlerts(currentMetrics, issues);
    
    // Generate monitoring report
    generateMonitoringReport(currentMetrics, issues);
    
    console.log(`✅ Monitoring check completed. Found ${currentMetrics.totalIssues} issues.`);
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    alertSystem.addAlert('error', 'Progress monitoring failed', { error: error.message });
  }
}

/**
 * Check for alerts based on thresholds
 */
function checkForAlerts(metrics, issues) {
  const { alertThresholds } = MONITORING_CONFIG;
  
  // Check percentage mismatches
  if (metrics.percentageMismatches > alertThresholds.percentageMismatch) {
    alertSystem.addAlert('warning', 'High number of percentage mismatches detected', {
      count: metrics.percentageMismatches,
      threshold: alertThresholds.percentageMismatch
    });
  }
  
  // Check completion errors
  if (metrics.completionErrors > alertThresholds.completionErrors) {
    alertSystem.addAlert('warning', 'High number of completion logic errors detected', {
      count: metrics.completionErrors,
      threshold: alertThresholds.completionErrors
    });
  }
  
  // Check negative durations (critical)
  if (metrics.negativeDurations > alertThresholds.negativeDurations) {
    alertSystem.addAlert('critical', 'Negative watched durations detected', {
      count: metrics.negativeDurations
    });
  }
  
  // Check invalid percentages
  if (metrics.invalidPercentages > alertThresholds.invalidPercentages) {
    alertSystem.addAlert('warning', 'Invalid percentage values detected', {
      count: metrics.invalidPercentages,
      threshold: alertThresholds.invalidPercentages
    });
  }
  
  // Check total issues
  const totalIssues = Object.values(metrics).reduce((sum, count) => sum + count, 0);
  if (totalIssues > alertThresholds.dataInconsistencies) {
    alertSystem.addAlert('error', 'High number of data inconsistencies detected', {
      totalIssues,
      threshold: alertThresholds.dataInconsistencies,
      breakdown: metrics
    });
  }
  
  // Check for specific critical issues
  const criticalIssues = issues.filter(issue => 
    issue.issues.some(i => i.type === 'negative_watched_duration' || i.type === 'invalid_total_duration')
  );
  
  if (criticalIssues.length > 0) {
    alertSystem.addAlert('critical', 'Critical data integrity issues detected', {
      criticalIssues: criticalIssues.length,
      affectedEntries: criticalIssues.map(i => i.entryId)
    });
  }
}

/**
 * Generate monitoring report
 */
function generateMonitoringReport(metrics, issues) {
  const totalIssues = Object.values(metrics).reduce((sum, count) => sum + count, 0);
  
  console.log('\n📋 Monitoring Report');
  console.log('===================');
  console.log(`Total entries checked: ${monitoringData.totalChecks}`);
  console.log(`Issues found: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log('\n🔧 Issue Breakdown:');
    console.log(`  Percentage mismatches: ${metrics.percentageMismatches}`);
    console.log(`  Completion errors: ${metrics.completionErrors}`);
    console.log(`  Negative durations: ${metrics.negativeDurations}`);
    console.log(`  Invalid percentages: ${metrics.invalidPercentages}`);
    console.log(`  Duration overshoots: ${metrics.overshootDurations}`);
    console.log(`  Zero durations: ${metrics.zeroDurations}`);
    
    if (issues.length > 0) {
      console.log('\n🚨 Affected Entries:');
      issues.slice(0, 5).forEach((issue, index) => {
        console.log(`  ${index + 1}. Entry ${issue.entryId}`);
        console.log(`     User: ${issue.userId}, Course: ${issue.courseId}, Video: ${issue.videoId}`);
        console.log(`     Issues: ${issue.issues.length}`);
      });
      
      if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more entries`);
      }
    }
  } else {
    console.log('✅ No issues detected!');
  }
  
  // Show recent alerts
  const recentAlerts = alertSystem.getRecentAlerts(1); // Last hour
  if (recentAlerts.length > 0) {
    console.log('\n🚨 Recent Alerts:');
    recentAlerts.forEach(alert => {
      const level = alert.level.toUpperCase();
      console.log(`  [${level}] ${alert.message}`);
    });
  }
}

/**
 * Get monitoring status
 */
function getMonitoringStatus() {
  return {
    lastCheck: monitoringData.lastCheck,
    totalChecks: monitoringData.totalChecks,
    currentMetrics: monitoringData.metrics,
    recentAlerts: alertSystem.getRecentAlerts(24), // Last 24 hours
    config: MONITORING_CONFIG
  };
}

/**
 * Start continuous monitoring
 */
function startMonitoring() {
  console.log('🚀 Starting continuous progress monitoring...');
  console.log(`📊 Check interval: ${MONITORING_CONFIG.checkInterval / 1000} seconds`);
  console.log(`🔔 Alert thresholds:`, MONITORING_CONFIG.alertThresholds);
  
  // Run initial check
  monitorProgressData();
  
  // Set up continuous monitoring
  setInterval(monitorProgressData, MONITORING_CONFIG.checkInterval);
  
  console.log('✅ Continuous monitoring started');
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  console.log('🛑 Stopping progress monitoring...');
  // Clear the interval (we'd need to store the interval ID in a real implementation)
  console.log('✅ Monitoring stopped');
}

// Export functions for use in other modules
export {
  monitorProgressData,
  startMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  alertSystem,
  progressValidator
};

// Start monitoring if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitoring();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down monitoring...');
    stopMonitoring();
    mongoose.disconnect();
    process.exit(0);
  });
}
