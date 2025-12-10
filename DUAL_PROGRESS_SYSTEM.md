# Dual Progress Tracking System

This document describes the implementation of a comprehensive dual progress tracking system for the course platform, featuring both video-level and course-level progress tracking.

## Overview

The system implements two distinct but interconnected progress tracking mechanisms:

1. **Video-level Progress**: Real-time tracking of individual video playback progress
2. **Course-level Progress**: Overall course completion based on video progress

## Architecture

### Backend (Express + MongoDB)

#### Database Schema

**Progress Model** (`server/models/Progress.js`)
```javascript
{
  userId: ObjectId,           // Reference to User
  courseId: ObjectId,         // Reference to Course
  videoId: ObjectId,          // Reference to Video
  
  // Video-level tracking
  watchedDuration: Number,    // Seconds watched
  totalDuration: Number,      // Total video duration
  watchedPercentage: Number,  // Real-time progress (0-100)
  
  // Course-level tracking
  completionPercentage: Number, // For course progress calculation
  isCompleted: Boolean,       // Video completion status
  
  // Metadata
  firstWatchedAt: Date,
  lastWatchedAt: Date,
  completedAt: Date,
  watchHistory: Array,        // Watch session history
  watchCount: Number,         // Number of watch sessions
  averageWatchTime: Number    // Average time per session
}
```

#### Key Methods

- `updateVideoProgress()`: Updates real-time video progress
- `getOverallCourseProgress()`: Calculates course-level progress
- `getCourseProgressSummary()`: Gets dashboard progress summary
- `markVideoCompleted()`: Marks video as completed
- `getNextVideo()`: Gets next video in sequence

#### API Endpoints

```
POST /api/progress/update          # Update video progress
GET  /api/progress/video/:courseId/:videoId  # Get video progress
GET  /api/progress/course/:courseId          # Get course progress
GET  /api/progress/dashboard                 # Get dashboard progress
POST /api/progress/complete-video            # Mark video completed
GET  /api/progress/resume/:courseId/:videoId # Get resume position
GET  /api/progress/next-video/:courseId/:videoId # Get next video
```

### Frontend (React + TypeScript)

#### Components

**VideoProgressBar** (`frontend/src/components/VideoProgressBar.tsx`)
- Displays real-time video progress on the video player page
- Shows both watched percentage and completion status
- Updates in real-time as user watches

**CourseProgressBar** (`frontend/src/components/CourseProgressBar.tsx`)
- Displays course-level progress on dashboard cards
- Shows overall course completion percentage
- Visual indicators for completed courses

#### Services

**ProgressService** (`frontend/src/services/progressService.ts`)
- Centralized API client for all progress operations
- Type-safe methods for progress updates
- Error handling and authentication

#### Types

**Progress Types** (`frontend/src/types/progress.ts`)
```typescript
interface VideoProgress {
  watchedDuration: number;
  totalDuration: number;
  watchedPercentage: number;    // Real-time (0-100)
  completionPercentage: number; // Course-level (0-100)
  isCompleted: boolean;
  lastPosition: number;
}

interface CourseProgress {
  totalVideos: number;
  completedVideos: number;
  courseProgressPercentage: number;
  lastWatchedVideo: string | null;
  lastWatchedPosition: number;
}
```

## Features

### Video-Level Progress Tracking

1. **Real-time Updates**: Progress updates every 5 seconds during video playback
2. **Resume Functionality**: Users can resume from where they left off
3. **Watch History**: Tracks multiple watch sessions per video
4. **Completion Detection**: Automatically marks videos as completed at 90% watched

### Course-Level Progress Tracking

1. **Aggregated Progress**: Calculates overall course progress from video completion
2. **Dashboard Display**: Shows progress on course cards in user dashboard
3. **Visual Indicators**: Different styling for completed vs. in-progress courses
4. **Statistics**: Tracks completed videos, total progress, and last watched

### User Experience Features

1. **Dual Progress Bars**: Separate progress indicators for video and course levels
2. **Real-time Updates**: Progress bars update as users watch videos
3. **Visual Feedback**: Color-coded progress bars and completion indicators
4. **Responsive Design**: Works on desktop and mobile devices

## Implementation Details

### Progress Calculation

**Video Progress**:
```javascript
watchedPercentage = (watchedDuration / totalDuration) * 100
```

**Course Progress**:
```javascript
courseProgressPercentage = (sum of all video completion percentages) / total videos
```

### Real-time Updates

1. **Throttled Updates**: Progress updates are throttled to every 5 seconds
2. **Optimistic Updates**: UI updates immediately, backend syncs in background
3. **Error Handling**: Failed updates are retried automatically
4. **Caching**: Video URLs and progress data are cached for performance

### Data Persistence

1. **MongoDB Storage**: All progress data stored in MongoDB with proper indexing
2. **User Isolation**: Progress data is isolated per user
3. **Course Association**: Progress linked to specific courses and videos
4. **Audit Trail**: Watch history and timestamps for analytics

## Usage Examples

### Updating Video Progress

```typescript
// In VideoPlayerPage.tsx
const updateProgress = useCallback(async (watchedDuration: number, totalDuration: number, timestamp: number) => {
  try {
    const response = await progressService.updateProgress({
      courseId: id!,
      videoId: currentVideoId,
      watchedDuration,
      totalDuration,
      timestamp
    });
    
    // Update UI with new progress data
    setCurrentVideoProgress(response.data.videoProgress.watchedPercentage);
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}, [id, currentVideoId]);
```

### Displaying Course Progress

```typescript
// In DashboardCard.tsx
<CourseProgressBar
  progress={progress}
  completedLessons={completedLessons}
  totalLessons={totalLessons}
  isCompleted={isCompleted}
/>
```

### Displaying Video Progress

```typescript
// In VideoPlayerPage.tsx
<VideoProgressBar
  watchedPercentage={currentVideo?.progress?.watchedPercentage || 0}
  completionPercentage={currentVideo?.progress?.completionPercentage || 0}
  isCompleted={currentVideo?.progress?.isCompleted || false}
/>
```

## Testing

### Test Script

Run the comprehensive test suite:

```bash
cd server
node test-dual-progress.mjs
```

The test script verifies:
- Video progress updates
- Course progress calculations
- Dashboard progress retrieval
- Video completion marking
- Resume functionality

### Manual Testing

1. **Video Progress**: Watch a video and verify progress bar updates
2. **Course Progress**: Complete videos and check dashboard progress
3. **Resume Function**: Leave a video and return to verify resume position
4. **Completion**: Verify videos are marked complete at 90% watched

## Performance Considerations

1. **Throttled Updates**: Progress updates limited to every 5 seconds
2. **Caching**: Video URLs and progress data cached locally
3. **Indexing**: Database indexes on userId, courseId, and videoId
4. **Lazy Loading**: Progress data loaded only when needed

## Security

1. **Authentication**: All progress endpoints require valid JWT token
2. **Authorization**: Users can only access their own progress data
3. **Input Validation**: All progress data validated before storage
4. **Rate Limiting**: Progress updates rate-limited to prevent abuse

## Future Enhancements

1. **Analytics Dashboard**: Detailed progress analytics for users
2. **Progress Sharing**: Share progress with friends or instructors
3. **Achievement System**: Badges and rewards for course completion
4. **Progress Export**: Export progress data for external tools
5. **Offline Progress**: Cache progress for offline viewing

## Troubleshooting

### Common Issues

1. **Progress Not Updating**: Check authentication token and network connection
2. **Wrong Progress Display**: Verify video duration and watched duration values
3. **Resume Not Working**: Check if resume position is being saved correctly
4. **Completion Not Detecting**: Verify 90% threshold and completion logic

### Debug Logging

The system includes comprehensive debug logging:

```javascript
console.log('🔧 [VideoPlayer] Updated video progress display:', watchedPercentage);
console.log('🔧 [VideoPlayer] Video completion percentage:', completionPercentage);
console.log('🔧 [VideoPlayer] Course progress:', courseProgress);
```

## Conclusion

The dual progress tracking system provides a comprehensive solution for tracking both individual video progress and overall course completion. The system is designed to be scalable, performant, and user-friendly while maintaining data integrity and security. 