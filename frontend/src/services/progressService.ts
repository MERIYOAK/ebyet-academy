import { 
  ProgressUpdateRequest, 
  ProgressUpdateResponse, 
  VideoProgress, 
  CourseProgress,
  DashboardData,
  ApiResponse 
} from '../types/progress';

import { buildApiUrl } from '../config/environment';

const API_BASE_URL = buildApiUrl('/api/progress');

class ProgressService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Update video progress (real-time video-level tracking)
   */
  async updateProgress(data: ProgressUpdateRequest): Promise<ApiResponse<ProgressUpdateResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Progress update failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  /**
   * Get video-level progress for a specific video
   */
  async getVideoProgress(courseId: string, videoId: string): Promise<ApiResponse<{ videoProgress: VideoProgress }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/video/${courseId}/${videoId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Get video progress failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting video progress:', error);
      throw error;
    }
  }

  /**
   * Get course-level progress with all videos
   */
  async getCourseProgress(courseId: string): Promise<ApiResponse<{ 
    course: any; 
    videos: any[]; 
    overallProgress: CourseProgress 
  }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/course/${courseId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Get course progress failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting course progress:', error);
      throw error;
    }
  }

  /**
   * Get dashboard progress for all purchased courses
   */
  async getDashboardProgress(): Promise<ApiResponse<DashboardData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Get dashboard progress failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting dashboard progress:', error);
      throw error;
    }
  }

  /**
   * Mark a video as completed
   */
  async completeVideo(courseId: string, videoId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/complete-video`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ courseId, videoId })
      });

      if (!response.ok) {
        throw new Error(`Complete video failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing video:', error);
      throw error;
    }
  }

  /**
   * Get resume position for a video
   */
  async getResumePosition(courseId: string, videoId: string): Promise<ApiResponse<{ resumePosition: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/resume/${courseId}/${videoId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Get resume position failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting resume position:', error);
      throw error;
    }
  }

  /**
   * Get next video in course
   */
  async getNextVideo(courseId: string, currentVideoId: string): Promise<ApiResponse<{ nextVideo: any }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/next-video/${courseId}/${currentVideoId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Get next video failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting next video:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const progressService = new ProgressService();
export default progressService; 