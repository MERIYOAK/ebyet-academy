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
      let titleEn = '';
      let titleTg = '';
      
      // Handle different title formats: string, JSON string, or object
      if (typeof video.title === 'string') {
        // Check if it's a JSON string
        if (video.title.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(video.title);
            if (typeof parsed === 'object' && parsed !== null) {
              titleEn = parsed.en || '';
              titleTg = parsed.tg || '';
            }
          } catch (e) {
            // Not valid JSON, treat as plain string
            titleEn = video.title;
          }
        } else {
          // Plain string
          titleEn = video.title;
        }
      } else if (typeof video.title === 'object' && video.title !== null) {
        // Already an object
        titleEn = video.title.en || '';
        titleTg = video.title.tg || '';
      }
      
      // Debug logging for Lesson 3
      if (lessonNumber === 3) {
        console.log('🐛 Lesson 3 Debug:', {
          originalTitle: video.title,
          titleEn,
          titleTg,
          titleType: typeof video.title
        });
      }
      
      // Extract display title from English version - handle multiple formats
      // Format 1: "Lesson 3 - Title Content"
      // Format 2: "Lesson 3: Title Content" 
      // Format 3: "Lesson 3 Title Content" (no separator)
      let displayTitleEn = titleEn;
      let displayTitleTg = titleTg;
      
      // Try dash format first
      const match = titleEn.match(/Lesson\s*\d+\s*[-:]\s*(.+)/i);
      if (match) {
        displayTitleEn = match[1].trim();
      } else {
        // Try format without separator - remove "Lesson X" prefix
        const noSeparatorMatch = titleEn.match(/Lesson\s*\d+\s+(.+)/i);
        if (noSeparatorMatch) {
          displayTitleEn = noSeparatorMatch[1].trim();
        }
      }
      
      // For Tigrinya, also try both formats
      const tgMatch = titleTg.match(/Lesson\s*\d+\s*[-:]\s*(.+)/i);
      if (tgMatch) {
        displayTitleTg = tgMatch[1].trim();
      } else {
        // Try format without separator
        const tgNoSeparatorMatch = titleTg.match(/Lesson\s*\d+\s+(.+)/i);
        if (tgNoSeparatorMatch) {
          displayTitleTg = tgNoSeparatorMatch[1].trim();
        } else {
          // Fallback: remove lesson prefix entirely
          displayTitleTg = titleTg.replace(/Lesson\s*\d+/i, '').trim() || displayTitleEn;
        }
      }
      
      // Debug logging for Lesson 3 results
      if (lessonNumber === 3) {
        console.log('🐛 Lesson 3 Results:', {
          displayTitleEn,
          displayTitleTg
        });
      }
      
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
