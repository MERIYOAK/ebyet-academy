import { Video } from '../types/video';

export interface GroupedVideos {
  lessonNumber: number | null;
  lessonTitle: string;
  videos: Video[];
}

export interface GroupedVideosWithDisplayTitle extends GroupedVideos {
  videos: (Video & { displayTitle: { en: string; tg: string } })[];
}

/**
 * Groups videos by lesson number extracted from title
 * @param videos Array of videos to group
 * @returns Object with lesson groups and metadata
 */
export const groupVideosByLesson = (videos: Video[]): {
  groupedVideos: GroupedVideosWithDisplayTitle[];
  totalLessons: number;
  totalVideos: number;
} => {
  if (!videos || videos.length === 0) {
    return {
      groupedVideos: [],
      totalLessons: 0,
      totalVideos: 0
    };
  }

  const lessonMap = new Map<number | null, Video[]>();
  const generalVideos: Video[] = [];

  // Process each video
  videos.forEach(video => {
    const title = typeof video.title === 'string' ? video.title : 
                 (video.title?.en || video.title?.tg || '');
    
    // Extract lesson number using regex /Lesson\s*(\d+)/i
    const match = title.match(/Lesson\s*(\d+)/i);
    const lessonNumber = match ? parseInt(match[1], 10) : null;

    if (lessonNumber !== null) {
      // Video belongs to a lesson
      if (!lessonMap.has(lessonNumber)) {
        lessonMap.set(lessonNumber, []);
      }
      lessonMap.get(lessonNumber)!.push(video);
    } else {
      // Video doesn't have lesson pattern, add to general
      generalVideos.push(video);
    }
  });

  // Create grouped array with sorted lessons
  const groupedVideos: GroupedVideosWithDisplayTitle[] = [];

  // Add numbered lessons in numerical order
  const sortedLessonNumbers = Array.from(lessonMap.keys()).sort((a, b) => a! - b!);
  sortedLessonNumbers.forEach(lessonNumber => {
    const lessonVideos = lessonMap.get(lessonNumber)!;
    
    // Process videos to remove "Lesson X -" prefix from display title
    const processedVideos = lessonVideos.map(video => {
      const titleEn = typeof video.title === 'string' ? video.title : (video.title?.en || '');
      const titleTg = typeof video.title === 'string' ? '' : (video.title?.tg || '');
      
      // Extract display title from English version
      const match = titleEn.match(/Lesson\s*\d+\s*-\s*(.+)/i);
      const displayTitleEn = match ? match[1].trim() : titleEn;
      const displayTitleTg = titleTg.replace(/Lesson\s*\d+\s*-\s*/i, '').trim() || displayTitleEn;
      
      return {
        ...video,
        displayTitle: {
          en: displayTitleEn,
          tg: displayTitleTg
        }
      };
    });

    groupedVideos.push({
      lessonNumber,
      lessonTitle: `Lesson ${lessonNumber}`,
      videos: processedVideos
    });
  });

  // Add general videos at the end if any exist
  if (generalVideos.length > 0) {
    groupedVideos.push({
      lessonNumber: null,
      lessonTitle: 'General',
      videos: generalVideos.map(video => {
        const titleEn = typeof video.title === 'string' ? video.title : (video.title?.en || '');
        const titleTg = typeof video.title === 'string' ? '' : (video.title?.tg || '');
        
        return {
          ...video,
          displayTitle: {
            en: titleEn,
            tg: titleTg
          }
        };
      })
    });
  }

  return {
    groupedVideos,
    totalLessons: sortedLessonNumbers.length,
    totalVideos: videos.length
  };
};
