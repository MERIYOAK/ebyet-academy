const Video = require('../models/Video');
const { getVideoMetadata } = require('./videoDurationDetector');
const { getSignedUrlForFile } = require('./s3CourseManager');

/**
 * Background processor to detect video durations
 * This runs after videos are uploaded to avoid blocking the upload process
 */
class BackgroundDurationProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * Add video to processing queue
   * @param {string} videoId - Video ID to process
   */
  async queueVideoForProcessing(videoId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        console.error(`❌ [BackgroundProcessor] Video not found: ${videoId}`);
        return;
      }

      // Skip if already has duration
      if (video.duration && video.duration > 0) {
        console.log(`⏭️ [BackgroundProcessor] Video ${videoId} already has duration: ${video.duration}s`);
        return;
      }

      this.processingQueue.push(videoId);
      console.log(`📋 [BackgroundProcessor] Queued video ${videoId} for duration detection`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (error) {
      console.error(`❌ [BackgroundProcessor] Error queuing video ${videoId}:`, error);
    }
  }

  /**
   * Process the queue of videos
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 [BackgroundProcessor] Starting to process ${this.processingQueue.length} videos`);

    while (this.processingQueue.length > 0) {
      const videoId = this.processingQueue.shift();
      await this.processVideo(videoId);
      
      // Add delay between processing to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.isProcessing = false;
    console.log(`✅ [BackgroundProcessor] Queue processing completed`);
  }

  /**
   * Process a single video for duration detection
   * @param {string} videoId - Video ID to process
   */
  async processVideo(videoId) {
    try {
      console.log(`🎬 [BackgroundProcessor] Processing video: ${videoId}`);
      
      const video = await Video.findById(videoId);
      if (!video) {
        console.error(`❌ [BackgroundProcessor] Video not found: ${videoId}`);
        return;
      }

      // Skip if already has duration
      if (video.duration && video.duration > 0) {
        console.log(`⏭️ [BackgroundProcessor] Video ${videoId} already has duration: ${video.duration}s`);
        return;
      }

      // Get signed URL for the video file
      const signedUrl = await getSignedUrlForFile(video.s3Key, 3600); // 1 hour expiry
      
      // Create a temporary file object for duration detection
      const tempFile = {
        path: signedUrl,
        originalname: video.originalName,
        mimetype: video.mimeType
      };

      // Detect duration
      const metadata = await getVideoMetadata(tempFile);
      const duration = metadata.duration;

      // Update video with detected duration
      video.duration = duration;
      video.formattedDuration = this.formatDuration(duration);
      await video.save();

      console.log(`✅ [BackgroundProcessor] Video ${videoId} duration detected: ${duration}s (${this.formatDuration(duration)})`);

    } catch (error) {
      console.error(`❌ [BackgroundProcessor] Error processing video ${videoId}:`, error);
      
      // Mark as failed but don't retry immediately
      try {
        const video = await Video.findById(videoId);
        if (video) {
          video.duration = 0; // Set to 0 to indicate detection failed
          video.formattedDuration = '0:00';
          await video.save();
        }
      } catch (updateError) {
        console.error(`❌ [BackgroundProcessor] Error updating failed video ${videoId}:`, updateError);
      }
    }
  }

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get processing status
   * @returns {Object} Processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      queue: this.processingQueue
    };
  }
}

// Export singleton instance
module.exports = new BackgroundDurationProcessor();
