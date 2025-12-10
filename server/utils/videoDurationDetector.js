const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Verify ffmpeg and ffprobe are available
console.log(`🔧 [videoDurationDetector] FFmpeg path: ${ffmpegInstaller.path}`);
console.log(`🔧 [videoDurationDetector] FFprobe path: ${ffprobeInstaller.path}`);
console.log(`🔧 [videoDurationDetector] FFmpeg exists: ${fs.existsSync(ffmpegInstaller.path)}`);
console.log(`🔧 [videoDurationDetector] FFprobe exists: ${fs.existsSync(ffprobeInstaller.path)}`);

/**
 * Write buffer to temporary file for ffmpeg analysis
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} Path to temporary file
 */
const writeBufferToTempFile = async (buffer, originalName) => {
  const tempDir = os.tmpdir();
  const tempFileName = `ffmpeg_${Date.now()}_${originalName}`;
  const tempFilePath = path.join(tempDir, tempFileName);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(tempFilePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(tempFilePath);
      }
    });
  });
};

/**
 * Get video duration from uploaded file
 * @param {Object} file - Multer file object
 * @returns {Promise<number>} Duration in seconds
 */
const getVideoDuration = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate ffmpeg/ffprobe availability
      if (!fs.existsSync(ffmpegInstaller.path)) {
        return reject(new Error('FFmpeg not found. Please check installation.'));
      }
      if (!fs.existsSync(ffprobeInstaller.path)) {
        return reject(new Error('FFprobe not found. Please check installation.'));
      }

      console.log(`🎬 [videoDurationDetector] Analyzing video: ${file.originalname}`);
      console.log(`📁 [videoDurationDetector] File size: ${file.size} bytes`);
      console.log(`📁 [videoDurationDetector] File buffer exists: ${!!file.buffer}`);

      let tempFilePath = null;
      
      // Handle memory storage (buffer) vs disk storage (path)
      if (file.buffer) {
        // Memory storage - write buffer to temp file
        console.log(`📝 [videoDurationDetector] Writing buffer to temp file...`);
        tempFilePath = await writeBufferToTempFile(file.buffer, file.originalname);
        console.log(`📁 [videoDurationDetector] Temp file created: ${tempFilePath}`);
      } else if (file.path && fs.existsSync(file.path)) {
        // Disk storage - use existing path
        tempFilePath = file.path;
        console.log(`📁 [videoDurationDetector] Using existing file path: ${tempFilePath}`);
      } else {
        return reject(new Error('No valid file buffer or path found'));
      }

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        // Clean up temp file if we created one
        if (file.buffer && tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) {
              console.warn(`⚠️ [videoDurationDetector] Failed to clean up temp file: ${unlinkErr.message}`);
            }
          });
        }

        if (err) {
          console.error(`❌ [videoDurationDetector] FFprobe error:`, err);
          return reject(new Error(`Failed to analyze video: ${err.message}`));
        }

        if (!metadata || !metadata.format) {
          console.error(`❌ [videoDurationDetector] No metadata found`);
          return reject(new Error('No video metadata found'));
        }

        const duration = metadata.format.duration;
        if (!duration || isNaN(duration)) {
          console.error(`❌ [videoDurationDetector] Invalid duration: ${duration}`);
          return reject(new Error('Invalid video duration'));
        }

        // Debug the raw duration value
        console.log(`🔍 [videoDurationDetector] Raw duration from ffmpeg: ${duration} (type: ${typeof duration})`);
        console.log(`🔍 [videoDurationDetector] Parsed duration: ${parseFloat(duration)}`);
        
        const durationInSeconds = Math.floor(parseFloat(duration));
        console.log(`✅ [videoDurationDetector] Duration detected: ${durationInSeconds} seconds (${formatDuration(durationInSeconds)})`);
        
        resolve(durationInSeconds);
      });
    } catch (error) {
      console.error(`💥 [videoDurationDetector] Unexpected error:`, error);
      reject(error);
    }
  });
};

/**
 * Format duration from seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (MM:SS)
 */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Validate video file format and get basic info
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Video metadata
 */
const getVideoMetadata = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate ffmpeg/ffprobe availability
      if (!fs.existsSync(ffmpegInstaller.path)) {
        return reject(new Error('FFmpeg not found. Please check installation.'));
      }
      if (!fs.existsSync(ffprobeInstaller.path)) {
        return reject(new Error('FFprobe not found. Please check installation.'));
      }

      console.log(`🔍 [videoDurationDetector] Getting metadata for: ${file.originalname}`);
      console.log(`📁 [videoDurationDetector] File size: ${file.size} bytes`);
      console.log(`📁 [videoDurationDetector] File buffer exists: ${!!file.buffer}`);

      let tempFilePath = null;
      
      // Handle memory storage (buffer) vs disk storage (path)
      if (file.buffer) {
        // Memory storage - write buffer to temp file
        console.log(`📝 [videoDurationDetector] Writing buffer to temp file...`);
        tempFilePath = await writeBufferToTempFile(file.buffer, file.originalname);
        console.log(`📁 [videoDurationDetector] Temp file created: ${tempFilePath}`);
      } else if (file.path && fs.existsSync(file.path)) {
        // Disk storage - use existing path
        tempFilePath = file.path;
        console.log(`📁 [videoDurationDetector] Using existing file path: ${tempFilePath}`);
      } else {
        return reject(new Error('No valid file buffer or path found'));
      }

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        // Clean up temp file if we created one
        if (file.buffer && tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) {
              console.warn(`⚠️ [videoDurationDetector] Failed to clean up temp file: ${unlinkErr.message}`);
            }
          });
        }

        if (err) {
          console.error(`❌ [videoDurationDetector] Metadata error:`, err);
          return reject(new Error(`Failed to get video metadata: ${err.message}`));
        }

        if (!metadata || !metadata.format) {
          return reject(new Error('No video metadata found'));
        }

        // Debug the full metadata structure
        console.log(`🔍 [videoDurationDetector] Full metadata structure:`);
        console.log(`   Format:`, JSON.stringify(metadata.format, null, 2));
        console.log(`   Streams count:`, metadata.streams?.length || 0);
        if (metadata.streams && metadata.streams.length > 0) {
          console.log(`   First stream:`, JSON.stringify(metadata.streams[0], null, 2));
        }

        const format = metadata.format;
        const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams?.find(stream => stream.codec_type === 'audio');

        // Debug the raw duration value from ffmpeg
        console.log(`🔍 [videoDurationDetector] Raw ffmpeg duration: ${format.duration} (type: ${typeof format.duration})`);
        console.log(`🔍 [videoDurationDetector] Raw ffmpeg duration parsed: ${parseFloat(format.duration)}`);
        
        const rawDuration = parseFloat(format.duration || 0);
        const durationInSeconds = Math.floor(rawDuration);
        
        console.log(`🔍 [videoDurationDetector] Raw duration: ${rawDuration}`);
        console.log(`🔍 [videoDurationDetector] Duration in seconds: ${durationInSeconds}`);

        const videoInfo = {
          duration: durationInSeconds,
          durationFormatted: formatDuration(durationInSeconds),
          fileSize: format.size || file.size,
          bitrate: format.bit_rate,
          format: format.format_name,
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          fps: videoStream?.r_frame_rate ? parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) : 0,
          hasVideo: !!videoStream,
          hasAudio: !!audioStream
        };

        console.log(`✅ [videoDurationDetector] Video metadata:`, {
          duration: videoInfo.durationFormatted,
          resolution: `${videoInfo.width}x${videoInfo.height}`,
          codec: `${videoInfo.videoCodec}/${videoInfo.audioCodec}`,
          fps: videoInfo.fps.toFixed(2),
          size: `${(videoInfo.fileSize / (1024 * 1024)).toFixed(2)} MB`
        });

        resolve(videoInfo);
      });
    } catch (error) {
      console.error(`💥 [videoDurationDetector] Metadata error:`, error);
      reject(error);
    }
  });
};

/**
 * Check if file is a valid video format
 * @param {Object} file - Multer file object
 * @returns {boolean} True if valid video
 */
const isValidVideoFormat = (file) => {
  const validMimeTypes = [
    'video/mp4',
    'video/webm', 
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/mkv'
  ];
  
  return validMimeTypes.includes(file.mimetype);
};

module.exports = {
  getVideoDuration,
  getVideoMetadata,
  formatDuration,
  isValidVideoFormat
}; 