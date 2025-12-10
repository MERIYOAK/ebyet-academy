import React from 'react';
import SecureVideoPlayer from './SecureVideoPlayer';

interface HLSVideoPlayerProps {
  src: string;
  title?: string;
  userId?: string;
  videoId?: string;
  courseId?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onReady?: () => void;
  playing?: boolean;
  playbackRate?: number;
  className?: string;
  drmEnabled?: boolean;
  watermarkData?: string;
  forensicWatermark?: any;
}

const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
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
  playing = false,
  playbackRate = 1,
  className = '',
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
      playing={playing}
      playbackRate={playbackRate}
      className={className}
      drmEnabled={drmEnabled}
      watermarkData={watermarkData}
      forensicWatermark={forensicWatermark}
    />
  );
};

export default HLSVideoPlayer;