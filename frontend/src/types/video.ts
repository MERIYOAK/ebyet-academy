export interface Video {
  id: string;
  title: string | { en: string; tg: string };
  description?: string | { en: string; tg: string };
  duration: string;
  videoUrl: string;
  locked?: boolean;
  hasAccess?: boolean;
  isFreePreview?: boolean;
  requiresPurchase?: boolean;
  drm?: {
    enabled: boolean;
    sessionId?: string;
    watermarkData?: string;
    encryptedUrl?: string;
  };
  completed?: boolean;
  progress?: {
    watchedDuration: number;
    totalDuration: number;
    watchedPercentage: number;
    completionPercentage: number;
    isCompleted: boolean;
    lastPosition?: number;
  };
}
