import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, CheckCircle, Clock, Lock } from 'lucide-react';
import { formatDuration } from '../utils/durationFormatter';
import { getLocalizedText } from '../utils/bilingualHelper';
import { groupVideosByLesson } from '../utils/lessonGrouper';

interface VideoProgress {
  watchedDuration: number;
  totalDuration: number;
  watchedPercentage: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastPosition?: number;
}

interface Video {
  id: string;
  title: string | { en: string; tg: string };
  duration: string;
  videoUrl: string;
  completed?: boolean;
  locked?: boolean;
  isFreePreview?: boolean;
  requiresPurchase?: boolean;
  progress?: VideoProgress;
}

interface VideoPlaylistProps {
  videos: Video[];
  currentVideoId: string;
  onVideoSelect: (videoId: string) => void;
}

const VideoPlaylist: React.FC<VideoPlaylistProps> = ({
  videos,
  currentVideoId,
  onVideoSelect
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'en') as 'en' | 'tg';
  
  // Group videos by lesson
  const { groupedVideos } = React.useMemo(() => {
    const result = groupVideosByLesson(videos);
    return result;
  }, [videos]);

  return (
    <div className="bg-gray-800 h-full flex flex-col text-white overflow-hidden">
      {/* Header - Hidden on mobile overlay since it's in the overlay header */}
      <div className="hidden md:block p-4 xxs:p-6 border-b border-gray-700">
        <h3 className="font-bold text-base xxs:text-lg text-white mb-2">{t('course_detail.course_content', 'Course Content')}</h3>
      </div>

      {/* Mobile Progress Header - Only shown in mobile overlay */}
      <div className="md:hidden p-3 xxs:p-4 border-b border-gray-700">
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto playlist-scrollbar">
        {groupedVideos.map((lessonGroup) => (
          <div key={lessonGroup.lessonNumber || 'general'}>
            {/* Lesson Header */}
            <div className="bg-gray-900 px-3 py-2 border-b border-gray-700">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                {lessonGroup.lessonTitle}
              </h4>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {lessonGroup.videos.length} {lessonGroup.videos.length === 1 ? 'video' : 'videos'}
              </p>
            </div>
            
            {/* Lesson Videos */}
            {lessonGroup.videos.map((video, index) => {
              const isCompleted = video.completed || video.progress?.isCompleted;
              const isCurrent = currentVideoId === video.id;
              
              return (
                <div
                  key={video.id}
                  className={`border-b border-gray-700 transition-all duration-200 ${
                    video.locked 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer hover:bg-gray-700'
                  } ${
                    isCurrent ? 'bg-cyan-900/30 border-cyan-600' : ''
                  }`}
                  onClick={() => !video.locked && onVideoSelect(video.id)}
                >
                  <div className="p-3 xxs:p-4 flex items-start space-x-2 xxs:space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {video.locked ? (
                        <div className="w-6 h-6 xxs:w-8 xxs:h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <Lock className="h-3 w-3 xxs:h-4 xxs:w-4 text-gray-400" />
                        </div>
                      ) : isCompleted ? (
                        <div className="w-6 h-6 xxs:w-8 xxs:h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 xxs:h-4 xxs:w-4 text-white" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 xxs:w-8 xxs:h-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center">
                          <Play className="h-3 w-3 xxs:h-4 xxs:w-4 text-white fill-current" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 xxs:w-8 xxs:h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 font-semibold text-xs xxs:text-sm">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-xs xxs:text-sm mb-1 line-clamp-2 ${
                        isCurrent ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {(() => {
                          // Try displayTitle first (processed by lessonGrouper)
                          if (video.displayTitle) {
                            const title = getLocalizedText(video.displayTitle, currentLanguage);
                            // If displayTitle gives us a valid result (not empty and not JSON-like), use it
                            if (title && !title.includes('{"') && !title.includes('"tg"')) {
                              return title;
                            }
                          }
                          
                          // Fallback to original title
                          return getLocalizedText(video.title, currentLanguage);
                        })()}
                        {video.isFreePreview && !video.locked && (
                          <span className="ml-1 xxs:ml-2 inline-flex items-center px-1 xxs:px-1.5 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                            🔓 {t('course_detail.free', 'Free')}
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center space-x-1 text-gray-400 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoPlaylist;