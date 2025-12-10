import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Star, Award, Zap, Target, TrendingUp } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import LoadingMessage from '../components/LoadingMessage';
import { useFeaturedCourses } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';

// Video file paths (from public folder)
const video1 = '/videos/3029420-hd_1920_1080_24fps (1) (1).mp4';
const video2 = '/videos/3945008-uhd_3840_2160_30fps (1) (1).mp4';
const video3 = '/videos/6794223-uhd_3840_2160_30fps (1) (1).mp4';
const video4 = '/videos/853779-hd_1920_1080_25fps (2).mp4';
const video5 = '/videos/2450251-uhd_3840_2160_30fps (1) (1).mp4';
const video6 = '/videos/855388-uhd_3840_2160_25fps (1) (1).mp4';


const HomePage = () => {
  const { t } = useTranslation();
  console.log('🏠 HomePage component rendering');
  
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [prevVideoIndex, setPrevVideoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // All videos in sequence
  const videos = [video1, video2, video3, video4, video5, video6];
  
  // Determine current state: which video is full screen and overlays
  const getVideoState = (index: number) => {
    if (index === 0) {
      // Video 1: Full screen only
      return { fullScreen: videos[0], squareVideo: null, rightHalf: null, leftHalf: null };
    } else if (index === 1) {
      // Video 2: Full screen only
      return { fullScreen: videos[1], squareVideo: null, rightHalf: null, leftHalf: null };
    } else if (index === 2) {
      // Video 3: Square in center, Video 2 still full screen
      return { fullScreen: videos[1], squareVideo: videos[2], rightHalf: null, leftHalf: null };
    } else if (index === 3) {
      // Video 4: Right half of screen, Video 2 and Video 3 still there
      return { fullScreen: videos[1], squareVideo: videos[2], rightHalf: videos[3], leftHalf: null };
    } else if (index === 4) {
      // Video 5: Left half of screen, all previous videos still there
      return { fullScreen: videos[1], squareVideo: videos[2], rightHalf: videos[3], leftHalf: videos[4] };
    } else if (index === 5) {
      // Video 6: Square in center, Video 1 as full screen background
      return { fullScreen: videos[0], squareVideo: videos[5], rightHalf: null, leftHalf: null };
    } else {
      // Pattern repeats: alternating collapse/expand and new video
      // Even indices (6, 8, 10...): Previous full screen collapses to square, previous square becomes full screen
      // Odd indices (7, 9, 11...): New video comes as full screen, previous square stays
      const cycleIndex = index - 6; // Start from 0 for the repeating pattern
      
      if (cycleIndex % 2 === 0) {
        // Collapse: Previous full screen → square, Previous square → full screen
        // Index 6: Video 1 (full) → square, Video 6 (square) → full screen
        // Index 8: Video 2 (full) → square, Video 1 (square) → full screen
        // Index 10: Video 3 (full) → square, Video 2 (square) → full screen
        const step = cycleIndex / 2;
        // At step 0: Video 1 was full, Video 6 was square → swap
        // At step 1: Video 2 was full, Video 1 was square → swap
        // At step 2: Video 3 was full, Video 2 was square → swap
        const wasFullScreenIndex = step % videos.length; // Was full screen, now becomes square
        const wasSquareIndex = (step === 0 ? 5 : step - 1) % videos.length; // Was square, now becomes full screen
        return { 
          fullScreen: videos[wasSquareIndex], 
          squareVideo: videos[wasFullScreenIndex], 
          rightHalf: null, 
          leftHalf: null 
        };
      } else {
        // New video: New video comes as full screen, previous square stays
        // Index 7: Video 2 (full), Video 1 (square from index 6)
        // Index 9: Video 3 (full), Video 2 (square from index 8)
        // Index 11: Video 4 (full), Video 3 (square from index 10)
        const step = Math.floor(cycleIndex / 2);
        // After swap at index 6, square is Video 1, so at index 7, Video 2 comes as full
        // After swap at index 8, square is Video 2, so at index 9, Video 3 comes as full
        const newFullScreenIndex = (step + 1) % videos.length; // New video as full screen
        const squareVideoIndex = step % videos.length; // Previous square stays (from the swap)
        return { 
          fullScreen: videos[newFullScreenIndex], 
          squareVideo: videos[squareVideoIndex], 
          rightHalf: null, 
          leftHalf: null 
        };
      }
    }
  };
  
  const currentState = getVideoState(currentVideoIndex);
  const prevState = getVideoState(prevVideoIndex);
  
  // Determine if we're in a collapse/expand transition (even indices >= 6)
  const isCollapseExpand = currentVideoIndex >= 6 && (currentVideoIndex - 6) % 2 === 0;
  const isNewVideoEnter = currentVideoIndex >= 6 && (currentVideoIndex - 6) % 2 === 1;
  
  // Use React Query for fetching featured courses
  const { data: featuredCourses = [], isLoading: loading, error } = useFeaturedCourses();

  // Detect scroll direction - fade out when scrolling down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past 50px
        setIsScrollingDown(true);
      } else {
        // Scrolling up or at top
        setIsScrollingDown(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);


  const testimonials = [
    {
      name: t('home.testimonials.jessica.name'),
      role: t('home.testimonials.jessica.role'),
      content: t('home.testimonials.jessica.content'),
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5
    },
    {
      name: t('home.testimonials.david.name'),
      role: t('home.testimonials.david.role'),
      content: t('home.testimonials.david.content'),
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5
    },
    {
      name: t('home.testimonials.maria.name'),
      role: t('home.testimonials.maria.role'),
      content: t('home.testimonials.maria.content'),
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5
    }
  ];

  const benefits = [
    {
      icon: Target,
      title: t('home.benefits.targeted_learning.title'),
      description: t('home.benefits.targeted_learning.description')
    },
    {
      icon: Award,
      title: t('home.benefits.expert_instructors.title'),
      description: t('home.benefits.expert_instructors.description')
    },
    {
      icon: Zap,
      title: t('home.benefits.actionable_content.title'),
      description: t('home.benefits.actionable_content.description')
    },
    {
      icon: TrendingUp,
      title: t('home.benefits.proven_strategies.title'),
      description: t('home.benefits.proven_strategies.description')
    }
  ];

  // Auto-rotate videos
  useEffect(() => {
    const interval = setInterval(() => {
      setPrevVideoIndex(currentVideoIndex);
      setIsTransitioning(true);
      // Immediately update index for seamless transition
      setCurrentVideoIndex((prev) => prev + 1);
      // Keep transition state very short for crossfade
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Reduced from 1000ms to 500ms for faster transition
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [currentVideoIndex]);

  // Log loading state changes
  useEffect(() => {
    if (loading) {
      console.log('🔄 HomePage loading featured courses');
    } else if (error) {
      console.error('❌ HomePage load error:', error);
    } else {
      console.log('✅ HomePage featured courses loaded:', featuredCourses.length);
    }
  }, [loading, error, featuredCourses.length]);

  const featuredGrid = useMemo(() => {
    console.log('🎨 HomePage featuredGrid rendering with:');
    console.log(`   - Loading: ${loading}`);
    console.log(`   - Featured courses count: ${featuredCourses.length}`);
    
    if (loading) {
      console.log('⏳ HomePage rendering loading state');
      return (
        <div>
          <LoadingMessage 
            message={t('home.loading_featured_courses', 'Loading featured courses, please wait...')}
            className="mb-8"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl shadow p-6 h-64 sm:h-72" />
            ))}
          </div>
        </div>
      );
    }
    
    if (error) {
      console.log('❌ HomePage rendering error state');
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-medium">{t('home.error_loading_courses', 'Failed to load courses')}</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        </div>
      );
    }
    
    if (!featuredCourses.length) {
      console.log('📭 HomePage rendering empty state');
      return (
        <div className="text-gray-500 text-center px-4 py-12">
          <p className="text-lg">{t('home.no_courses_available', 'No courses yet. Check back soon.')}</p>
        </div>
      );
    }
    
    // Rendering featured course cards
    console.log('✅ HomePage rendering featured course cards');
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {featuredCourses.map((c) => {
          // Using the centralized parseDurationToSeconds utility
          const totalSeconds = (c.videos || []).reduce((acc, v) => acc + parseDurationToSeconds(v.duration), 0);
          return (
          <CourseCard
            key={c._id}
            id={c._id}
            title={c.title}
            description={c.description}
            thumbnail={c.thumbnailURL || ''}
            price={c.price}
            duration={`${totalSeconds}`}
            students={c.totalEnrollments || 0}
            lessons={(c.videos || []).length}
            instructor={t('brand.name')}
            tags={c.tags || []}
          />
        );})}
      </div>
    );
  }, [featuredCourses, loading, error, t]);

  const fullScreenVideoRef = useRef<HTMLVideoElement>(null);
  const prevFullScreenVideoRef = useRef<HTMLVideoElement>(null);
  const squareVideoRef = useRef<HTMLVideoElement>(null);
  const rightHalfVideoRef = useRef<HTMLVideoElement>(null);
  const leftHalfVideoRef = useRef<HTMLVideoElement>(null);

  // Handle video transitions - ensure continuous playback
  useEffect(() => {
    // Preload and play full screen video immediately
    if (fullScreenVideoRef.current && currentState.fullScreen) {
      const video = fullScreenVideoRef.current;
      // Check if source actually changed by comparing the src string
      const currentSrc = video.src;
      
      // Only reset if source changed (check ends of URL to handle different formats)
      if (!currentSrc.includes(currentState.fullScreen.split('/').pop() || '')) {
        video.currentTime = 0;
      }
      
      // Ensure video is playing
      if (video.paused || video.ended) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Retry play if it fails
            setTimeout(() => video.play().catch(console.error), 100);
          });
        }
      }
    }
    
    // Keep previous video playing during transition for crossfade
    if (prevFullScreenVideoRef.current && prevState.fullScreen && isTransitioning) {
      const video = prevFullScreenVideoRef.current;
      if (video.paused || video.ended) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(console.error);
        }
      }
    }
    
    // Square video
    if (currentState.squareVideo && squareVideoRef.current) {
      const video = squareVideoRef.current;
      if (video.paused || video.ended) {
        // Delay square video appearance only for initial appearance
        const delay = currentVideoIndex < 6 ? 2000 : 0;
        setTimeout(() => {
          if (squareVideoRef.current) {
            const playPromise = squareVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                setTimeout(() => squareVideoRef.current?.play().catch(console.error), 100);
              });
            }
          }
        }, delay);
      }
    }
    
    // Right half video
    if (currentState.rightHalf && rightHalfVideoRef.current) {
      const video = rightHalfVideoRef.current;
      if (video.paused || video.ended) {
        const delay = currentVideoIndex === 3 ? 4000 : 0;
        setTimeout(() => {
          if (rightHalfVideoRef.current) {
            const playPromise = rightHalfVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                setTimeout(() => rightHalfVideoRef.current?.play().catch(console.error), 100);
              });
            }
          }
        }, delay);
      }
    }
    
    // Left half video
    if (currentState.leftHalf && leftHalfVideoRef.current) {
      const video = leftHalfVideoRef.current;
      if (video.paused || video.ended) {
        const delay = currentVideoIndex === 4 ? 6000 : 0;
        setTimeout(() => {
          if (leftHalfVideoRef.current) {
            const playPromise = leftHalfVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                setTimeout(() => leftHalfVideoRef.current?.play().catch(console.error), 100);
              });
            }
          }
        }, delay);
      }
    }
  }, [currentVideoIndex, currentState, prevState, isTransitioning]);

  // Ensure videos keep playing continuously - handle pause events
  useEffect(() => {
    const handleVideoPlay = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      if (video.paused) {
        video.play().catch(console.error);
      }
    };

    const videos = [
      fullScreenVideoRef.current,
      prevFullScreenVideoRef.current,
      squareVideoRef.current,
      rightHalfVideoRef.current,
      leftHalfVideoRef.current
    ].filter(Boolean) as HTMLVideoElement[];

    videos.forEach(video => {
      video.addEventListener('pause', handleVideoPlay);
      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play().catch(console.error);
      });
    });

    return () => {
      videos.forEach(video => {
        video.removeEventListener('pause', handleVideoPlay);
        video.removeEventListener('ended', () => {});
      });
    };
  }, [currentVideoIndex]);

  return (
    <div>
      {/* Video Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* EBYET Academy Label - Top Left */}
        <Link
          to="/"
          className={`fixed top-8 left-12 sm:top-10 sm:left-16 z-[98] flex items-center gap-2 transition-all duration-500 ease-in-out ${
            isScrollingDown ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
          style={{ 
            fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            transform: 'scale(1.5)',
            transformOrigin: 'top left'
          }}
          aria-label="EBYET Academy"
        >
          <span className="border-2 border-white backdrop-blur-sm text-white px-4 sm:px-5 md:px-6 py-1 sm:py-1.5 md:py-2 rounded-md font-bold text-base sm:text-lg md:text-xl lg:text-2xl shadow-lg tracking-tight ">
            EBYET
          </span>
          <span className="text-white font-bold text-base sm:text-lg md:text-xl lg:text-2xl drop-shadow-lg tracking-tight">
            Academy
          </span>
        </Link>

        {/* Previous Full Screen Video (for crossfade) */}
        {isTransitioning && prevState.fullScreen && prevState.fullScreen !== currentState.fullScreen && (
          <video
            ref={prevFullScreenVideoRef}
            key={`prev-full-${prevVideoIndex}`}
            className="absolute inset-0 w-full h-full object-cover"
            src={prevState.fullScreen}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onPause={(e) => {
              const video = e.currentTarget;
              if (!video.ended) {
                video.play().catch(console.error);
              }
            }}
            style={{
              zIndex: 1,
              opacity: 1,
              animation: 'fadeOut 0.5s ease-in-out forwards' // Faster fade out
            }}
          />
        )}

        {/* Current Full Screen Video Background */}
        <video
          ref={fullScreenVideoRef}
          key={`full-${currentVideoIndex}`}
          className="absolute inset-0 w-full h-full object-cover"
          src={currentState.fullScreen}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={(e) => {
            const video = e.currentTarget;
            if (video.paused) {
              video.play().catch(console.error);
            }
          }}
          onPause={(e) => {
            const video = e.currentTarget;
            if (!video.ended) {
              video.play().catch(console.error);
            }
          }}
          style={{
            zIndex: 2,
            opacity: 1, // Always visible - no darkening
            animation: isTransitioning 
              ? (isCollapseExpand ? 'expandToFullScreen 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : (isNewVideoEnter ? 'newVideoEnter 0.5s ease-in-out forwards' : 'fadeIn 0.5s ease-in-out forwards'))
              : 'none'
          }}
        />

        {/* Square Video - Center (only when squareVideo is set) */}
        {currentState.squareVideo && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div 
              className="relative w-2/3 h-2/3 max-w-[800px] max-h-[800px] aspect-square"
              style={{
                animation: isCollapseExpand && isTransitioning
                  ? 'collapseToSquare 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                  : currentVideoIndex < 6
                  ? 'squareVideoEnter 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 2s both'
                  : 'none',
                opacity: 1 // Always visible - no darkening
              }}
            >
              <video
                ref={squareVideoRef}
                key={`square-${currentVideoIndex}`}
                className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-2xl"
                src={currentState.squareVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }}
                onPause={(e) => {
                  const video = e.currentTarget;
                  if (!video.ended) {
                    video.play().catch(console.error);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Right Half Video (Video 4) */}
        {currentState.rightHalf && (
          <div 
            className="absolute inset-0 flex items-center justify-end"
            style={{ zIndex: 11 }}
          >
            <div 
              className="relative w-1/2 h-full"
              style={{
                animation: 'squareVideoEnter 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 4s both',
                opacity: isTransitioning ? 0 : 1
              }}
            >
              <video
                ref={rightHalfVideoRef}
                key={`right-half-${currentVideoIndex}`}
                className="absolute inset-0 w-full h-full object-cover"
                src={currentState.rightHalf}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }}
                onPause={(e) => {
                  const video = e.currentTarget;
                  if (!video.ended) {
                    video.play().catch(console.error);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Left Half Video (Video 5) */}
        {currentState.leftHalf && (
          <div 
            className="absolute inset-0 flex items-center justify-start"
            style={{ zIndex: 12 }}
          >
            <div 
              className="relative w-1/2 h-full"
              style={{
                animation: 'squareVideoEnter 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 6s both',
                opacity: isTransitioning ? 0 : 1
              }}
            >
              <video
                ref={leftHalfVideoRef}
                key={`left-half-${currentVideoIndex}`}
                className="absolute inset-0 w-full h-full object-cover"
                src={currentState.leftHalf}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }}
                onPause={(e) => {
                  const video = e.currentTarget;
                  if (!video.ended) {
                    video.play().catch(console.error);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Removed overlay to prevent darkening */}
      </section>

      {/* Featured Courses */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
              {t('home.featured_courses_title')}
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              {t('home.featured_courses_subtitle')}
            </p>
          </div>
          {featuredGrid}
          <div className="text-center mt-8 sm:mt-12">
            <Link
              to="/courses"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span>{t('home.view_all_courses')}</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
              {t('home.why_choose_title')}
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              {t('home.why_choose_subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 text-center"
              >
                <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <benefit.icon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">{benefit.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
              {t('home.faq.title')}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              {t('home.faq.subtitle')}
            </p>
          </div>
          
          <div className="space-y-6 sm:space-y-8">
            {[
              {
                question: t('home.faq.questions.get_started.question'),
                answer: t('home.faq.questions.get_started.answer')
              },
              {
                question: t('home.faq.questions.final_purchases.question'),
                answer: t('home.faq.questions.final_purchases.answer')
              },
              {
                question: t('home.faq.questions.mobile.question'),
                answer: t('home.faq.questions.mobile.answer')
              }
            ].map((faq, index) => (
              <div 
                key={index}
                className="group bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors duration-300 flex items-center">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                  {faq.question}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed pl-8 sm:pl-9 group-hover:text-gray-700 transition-colors duration-300">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
              {t('home.success_stories_title')}
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              {t('home.success_stories_subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mr-3 sm:mr-4"
                  />
                  <div>
                    <div className="font-bold text-gray-800 text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-gray-600 text-xs sm:text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-3 sm:px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            {t('home.cta_title')}
          </h2>
          <p className="text-sm sm:text-base md:text-xl mb-6 sm:mb-8 text-blue-100 px-4">
            {t('home.cta_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              {t('home.cta_button')}
            </Link>
            <Link
              to="/courses"
              className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
            >
              {t('home.view_all_courses')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;