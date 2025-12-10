import React from 'react';
import SecureVideoPlayer from './SecureVideoPlayer';

interface EnhancedVideoPlayerProps {
  src: string;
  title?: string;
  userId?: string;
  videoId?: string;
  courseId?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: MediaError | null) => void;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (watchedDuration: number, totalDuration: number) => void;
  playing?: boolean;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  className?: string;
  initialTime?: number;
  showControls?: boolean;
  onControlsToggle?: (visible: boolean) => void;
  drmEnabled?: boolean;
  watermarkData?: string;
  forensicWatermark?: any;
}

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  title,
  userId,
  videoId,
  courseId,
  onPlay,
  onPause,
  onEnded,
  onError,
  onReady,
  onTimeUpdate,
  onProgress,
  playing = false,
  playbackRate = 1,
  onPlaybackRateChange,
  className = '',
  initialTime = 0,
  showControls = true,
  onControlsToggle,
  drmEnabled = true,
  watermarkData,
  forensicWatermark
}) => {
  // Use SecureVideoPlayer for enhanced security
  return (
    <SecureVideoPlayer
      src={src}
      title={title}
      userId={userId}
      videoId={videoId}
      courseId={courseId}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onError={onError}
      onReady={onReady}
      onTimeUpdate={onTimeUpdate}
      onProgress={onProgress}
      playing={playing}
      playbackRate={playbackRate}
      onPlaybackRateChange={onPlaybackRateChange}
      className={className}
      initialTime={initialTime}
      showControls={showControls}
      onControlsToggle={onControlsToggle}
      drmEnabled={drmEnabled}
      watermarkData={watermarkData}
      forensicWatermark={forensicWatermark}
    />
  );
};

export default EnhancedVideoPlayer;