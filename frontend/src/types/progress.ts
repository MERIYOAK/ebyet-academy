// Video-level progress tracking
export interface VideoProgress {
  watchedDuration: number;
  totalDuration: number;
  watchedPercentage: number; // Real-time video progress (0-100)
  completionPercentage: number; // For course-level tracking (0-100)
  isCompleted: boolean;
  lastPosition: number;
  lastWatchedAt?: string;
}

// Course-level progress tracking
export interface CourseProgress {
  totalVideos: number;
  completedVideos: number;
  totalProgress: number;
  courseProgressPercentage: number;
  lastWatchedVideo: string | null;
  lastWatchedPosition: number;
}

// Dashboard course progress summary
export interface CourseProgressSummary {
  totalVideos: number;
  completedVideos: number;
  courseProgressPercentage: number;
  lastWatchedAt: string | null;
}

// Progress update request
export interface ProgressUpdateRequest {
  courseId: string;
  videoId: string;
  watchedDuration: number;
  totalDuration: number;
  timestamp: number;
}

// Progress update response
export interface ProgressUpdateResponse {
  videoProgress: VideoProgress;
  courseProgress: CourseProgress;
}

// Video with progress
export interface VideoWithProgress {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  completed?: boolean;
  locked?: boolean;
  progress: VideoProgress;
}

// Course with progress
export interface CourseWithProgress {
  _id: string;
  title: string;
  thumbnail: string;
  duration: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lastWatched?: string | null;
  videos: VideoWithProgress[];
  isCompleted: boolean;
}

// Dashboard data
export interface DashboardData {
  courses: CourseWithProgress[];
  totalCourses: number;
  completedCourses: number;
  totalProgress: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

// Progress API endpoints
export interface ProgressApi {
  updateProgress: (data: ProgressUpdateRequest) => Promise<ApiResponse<ProgressUpdateResponse>>;
  getVideoProgress: (courseId: string, videoId: string) => Promise<ApiResponse<{ videoProgress: VideoProgress }>>;
  getCourseProgress: (courseId: string) => Promise<ApiResponse<{ course: any; videos: VideoWithProgress[]; overallProgress: CourseProgress }>>;
  getDashboardProgress: () => Promise<ApiResponse<DashboardData>>;
} 