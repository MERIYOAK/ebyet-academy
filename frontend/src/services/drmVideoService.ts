import { buildApiUrl } from '../config/environment';

export interface DRMVideoData {
  video: {
    id: string;
    title: string;
    description: string;
    duration: number;
    formattedDuration: string;
    order: number;
    courseId: string;
    courseVersion: number;
    courseTitle: string;
    isFreePreview: boolean;
    locked: boolean;
    hasAccess: boolean;
  };
  drm: {
    enabled: boolean;
    sessionId: string | null;
    encryptedUrl: string | null;
    securityHeaders: Record<string, string>;
    expiresIn: number;
    watermarkData: string | null;
  };
  forensic: {
    watermark: string;
    userId: string;
    videoId: string;
    sessionId: string;
    timestamp: number;
    hash: string;
  };
  security: {
    drmEnabled: boolean;
    watermarkingEnabled: boolean;
    screenRecordingDetection: boolean;
    extensionDetection: boolean;
    sessionBasedAccess: boolean;
  };
}

export interface DRMCourseVideosData {
  course: {
    id: string;
    title: string;
    description: string;
    videos: Array<{
      id: string;
      title: string;
      description: string;
      duration: number;
      formattedDuration: string;
      order: number;
      courseId: string;
      courseVersion: number;
      isFreePreview: boolean;
      locked: boolean;
      hasAccess: boolean;
      drm: {
        enabled: boolean;
        sessionId: string | null;
        encryptedUrl: string | null;
        watermarkData: string | null;
        expiresIn: number;
      };
    }>;
  };
  userHasPurchased: boolean;
  drm: {
    enabled: boolean;
    totalSessions: number;
  };
}

class DRMVideoService {
  private static instance: DRMVideoService;

  private constructor() {}

  public static getInstance(): DRMVideoService {
    if (!DRMVideoService.instance) {
      DRMVideoService.instance = new DRMVideoService();
    }
    return DRMVideoService.instance;
  }

  /**
   * Get video with DRM protection
   */
  public async getVideoWithDRM(videoId: string): Promise<DRMVideoData> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/api/drm/videos/${videoId}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch video');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch DRM video:', error);
      throw error;
    }
  }

  /**
   * Get course videos with DRM protection
   */
  public async getCourseVideosWithDRM(courseId: string, version: number = 1): Promise<DRMCourseVideosData> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/api/drm/courses/${courseId}/videos?version=${version}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch course videos');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch DRM course videos:', error);
      throw error;
    }
  }

  /**
   * Validate DRM session
   */
  public async validateDRMSession(sessionId: string, videoId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/api/drm/sessions/${sessionId}/validate`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Session validation failed');
      }

      const data = await response.json();
      return data.data.valid;
    } catch (error) {
      console.error('❌ Failed to validate DRM session:', error);
      return false;
    }
  }

  /**
   * Revoke DRM session
   */
  public async revokeDRMSession(sessionId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/api/drm/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke session');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to revoke DRM session:', error);
      return false;
    }
  }

  /**
   * Get DRM statistics (admin only)
   */
  public async getDRMStats(): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/api/drm/stats'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch DRM stats');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch DRM stats:', error);
      throw error;
    }
  }

  /**
   * Decrypt video URL using DRM service
   */
  public async decryptVideoUrl(encryptedUrl: string, sessionId: string): Promise<string> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/api/drm/decrypt-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          encryptedUrl,
          sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decrypt video URL');
      }

      const result = await response.json();
      return result.data.decryptedUrl;
    } catch (error) {
      console.error('❌ Failed to decrypt video URL:', error);
      throw error;
    }
  }

  /**
   * Check if DRM is enabled for current user
   */
  public isDRMEnabled(): boolean {
    // Check if user is admin (admins don't use DRM)
    const userRole = localStorage.getItem('userRole');
    return userRole !== 'admin';
  }

  /**
   * Get current user ID
   */
  public getCurrentUserId(): string | null {
    return localStorage.getItem('userId');
  }

  /**
   * Get current user role
   */
  public getCurrentUserRole(): string | null {
    return localStorage.getItem('userRole');
  }
}

export default DRMVideoService;
