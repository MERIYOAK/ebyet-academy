import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Award, Users, Clock, Star, HelpCircle, Megaphone } from 'lucide-react';
import { FaFacebook, FaYoutube, FaTiktok } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import BundleCard from '../components/BundleCard';
import LoadingMessage from '../components/LoadingMessage';
import { useFeaturedCourses } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';
import { useFeaturedBundles } from '../hooks/useBundles';
import { buildApiUrl } from '../config/environment';
import heroImage from '../assets/images/hero-image.jpeg';

// Import student images
import abrhamtesfayImage from '../assets/images/students image/Abrham Tesfay.jpg';
import amanuelmengisteabImage from '../assets/images/students image/Amanuel Mengisteab.jpg';
import frezgikasaImage from '../assets/images/students image/frezgi kasa 1.jpg';
import hailetekieImage from '../assets/images/students image/Haile Tekie.jpg';
import teamedebesayImage from '../assets/images/students image/Teame Debesay.jpg';
import yonasMesmerImage from '../assets/images/students image/Yonas Mesmer.jpg';

interface Announcement {
  _id: string;
  title: {
    en: string;
    tg: string;
  };
  content: {
    en: string;
    tg: string;
  };
  date: string;
  isActive: boolean;
  order: number;
}

const HomePage = () => {
  const { t, i18n } = useTranslation();
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isAnnouncementAutoPlaying, setIsAnnouncementAutoPlaying] = useState(true);
  
  // Quotes slideshow state
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isQuoteAutoPlaying, setIsQuoteAutoPlaying] = useState(true);
  
  
  // Use React Query for fetching featured courses and bundles from API
  const { data: featuredCourses = [], isLoading: coursesLoading, error: coursesError } = useFeaturedCourses();
  const { data: featuredBundles = [], isLoading: bundlesLoading } = useFeaturedBundles();
  
  // Investing quotes (bilingual)
  const investingQuotes = [
    {
      en: "The best investment you can make is in yourself.",
      tg: "ዝበለጸ ወፍሪ ኣብ ርእስኻ እትገብሮ ወፍሪ እዩ።"
    },
    {
      en: "Don't invest in things you don't understand.",
      tg: "ኣብ ዘይትርድኦ ነገራት ኣይተውፍር።"
    },
    {
      en: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
      tg: "ዕዳጋ ስቶክ ንኩሉ ቁጽራዊ ዋጋ ብዝፈልጡ ሰባት ዘዕለቅለቐ እኳ እንተኾነ: እቲ ርቱዕ ዋጋ ዝፈልጡ ግን ውሑዳት እዮም።"
    },
    {
      en: "Risk comes from not knowing what you're doing.",
      tg: "ሓደጋ ካብ እንታይ ከም እትገብር ዘለኻ ዘይምርዳእ እዩ ዝመጽእ።"
    },
    {
      en: "The goal of a successful trader is to make the best trades. Money is secondary.",
      tg: "ዕላማ ዕዉት ነጋዳይ ዝበለጸ ንግዲ ምግባር እዩ። ገንዘብ ካልኣይ ደረጃ እዩ።"
    }
  ];




  // Fetch announcements from API
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const response = await fetch(buildApiUrl('/api/announcements/active'));
        
        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }

        const data = await response.json();
        const activeAnnouncements = (data.announcements || []).filter((a: Announcement) => a.isActive);
        setAnnouncements(activeAnnouncements);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Auto-rotate announcements
  useEffect(() => {
    if (!isAnnouncementAutoPlaying || announcements.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isAnnouncementAutoPlaying, announcements.length]);

  // Auto-rotate quotes
  useEffect(() => {
    if (!isQuoteAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % investingQuotes.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [isQuoteAutoPlaying, investingQuotes.length]);


  const featuredGrid = useMemo(() => {
    if (coursesLoading) {
      return (
        <div>
          <LoadingMessage 
            message={t('home.loading_featured_courses', 'Loading featured courses, please wait...')}
            className="mb-8"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tiny:gap-4 xs:gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl shadow p-4 tiny:p-5 xs:p-6 h-56 tiny:h-64 sm:h-72" />
            ))}
          </div>
        </div>
      );
    }
    
    if (coursesError) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-medium">{t('home.error_loading_courses', 'Failed to load courses')}</p>
            <p className="text-sm text-gray-500">{coursesError instanceof Error ? coursesError.message : String(coursesError)}</p>
          </div>
        </div>
      );
    }
    
    if (!featuredCourses.length) {
      return (
        <div className="text-gray-500 text-center px-4 py-12">
          <p className="text-lg">{t('home.no_courses_available', 'No courses yet. Check back soon.')}</p>
        </div>
      );
    }
    
    // Rendering featured course cards (max 3)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tiny:gap-4 xs:gap-6 sm:gap-8">
        {featuredCourses.slice(0, 3).map((c, index) => {
          // Using the centralized parseDurationToSeconds utility
          const totalSeconds = (c.videos || []).reduce((acc, v) => acc + parseDurationToSeconds(v.duration), 0);
          
          console.log(`🔍 [HomePage] Featured course ${index + 1}:`, {
            id: c._id,
            title: c.title,
            isPurchased: c.isPurchased,
            progress: c.progress,
            totalLessons: c.totalLessons,
            completedLessons: c.completedLessons,
            isCompleted: c.isCompleted
          });
          
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
            isPurchased={c.isPurchased || false}
            progress={c.progress}
            totalLessons={c.totalLessons}
            completedLessons={c.completedLessons}
            lastWatched={c.lastWatched}
            videos={c.videos}
            isCompleted={c.isCompleted}
          />
        );})}
      </div>
    );
  }, [featuredCourses, coursesLoading, coursesError, t]);


  return (
    <div>
      {/* Hero Section - Full Width Image with Overlay Text */}
      <section 
        className="relative h-screen flex items-center overflow-hidden w-full"
      >
        {/* Full Width Hero Image Background */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={heroImage} 
            alt="Hero" 
            className="w-full h-full object-cover object-right md:object-center"
          />
          {/* Dark overlay for better text readability - darker on right side for purple text */}
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 container mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-12 2xl:px-16 w-full">
          <div className="flex flex-col justify-center space-y-2 tiny:space-y-2.5 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 max-w-2xl lg:max-w-3xl xl:max-w-4xl pt-3 tiny:pt-4 xs:pt-6 sm:pt-8 md:pt-10 lg:pt-12 xl:pt-16 pb-8 tiny:pb-12 xs:pb-16 sm:pb-20 md:pb-24">
            {/* Big Title with Gradient */}
            <h1 
              className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight pt-6 tiny:pt-8 xs:pt-10 sm:pt-12 md:pt-16 lg:pt-20 xl:pt-24 pb-1.5 tiny:pb-2 xs:pb-3 sm:pb-4"
              style={{
                background: 'linear-gradient(to right, #00BFFF 0%, #00BFFF 40%, #BA55D3 60%, #BA55D3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.9)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 24px rgba(186, 85, 211, 0.5))',
              }}
            >
              {t('home.hero_main_title')}
            </h1>

            {/* Bullet Points */}
            <div className="space-y-1 tiny:space-y-1.5 xs:space-y-2 sm:space-y-2.5 md:space-y-3">
              {[
                t('home.hero_bullet_1'),
                t('home.hero_bullet_2'),
                t('home.hero_bullet_3'),
              ].map((text, index) => (
                <div key={index} className="flex items-start gap-1.5 tiny:gap-2 xs:gap-2.5 sm:gap-3">
                  <div
                    className="w-1 h-1 tiny:w-1.5 tiny:h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 mt-1 tiny:mt-1.5 xs:mt-2"
                    style={{ backgroundColor: '#00BFFF' }}
                  />
                  <p className="text-white/90 text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg leading-relaxed drop-shadow-lg">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col xs:flex-row gap-2 tiny:gap-2.5 xs:gap-3 sm:gap-4 pt-1 tiny:pt-1.5 xs:pt-2">
              <Link
                to="/courses"
                className="px-3 tiny:px-4 xs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 text-[10px] tiny:text-xs xs:text-sm sm:text-base font-semibold text-white rounded-lg text-center transition-all hover:opacity-90 hover:scale-105 active:scale-95 whitespace-nowrap shadow-lg"
                style={{ backgroundColor: '#00BFFF' }}
              >
                {t('home.view_all_courses', 'Explore Courses')}
              </Link>
              <Link
                to="/contact"
                className="px-3 tiny:px-4 xs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 text-[10px] tiny:text-xs xs:text-sm sm:text-base font-semibold rounded-lg text-center border-2 transition-all hover:bg-cyan-400/10 hover:scale-105 active:scale-95 whitespace-nowrap shadow-lg backdrop-blur-sm"
                style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
              >
                {t('home.contact_us', 'Get in Touch')}
              </Link>
            </div>

            {/* Social Proof */}
            <div className="pt-1 tiny:pt-1.5 xs:pt-2 sm:pt-3">
              <p className="text-white/70 text-[9px] tiny:text-[10px] xs:text-xs sm:text-sm mb-1 tiny:mb-1.5 xs:mb-2 drop-shadow-md">
                {t('home.hero_social_proof', 'Follow us here...')}
              </p>
              <div className="flex items-center gap-1 tiny:gap-1.5 xs:gap-2 sm:gap-3 p-1 tiny:p-1.5 xs:p-2 sm:p-3">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-cyan-500/20 backdrop-blur-sm border border-white/20 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="X (Twitter)"
                >
                  <svg 
                    className="w-3 h-3 tiny:w-3.5 tiny:h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white hover:text-cyan-400 transition-colors duration-300" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-cyan-500/20 backdrop-blur-sm border border-white/20 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="YouTube"
                >
                  <FaYoutube className="w-3 h-3 tiny:w-3.5 tiny:h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white hover:text-cyan-400 transition-colors duration-300" />
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-cyan-500/20 backdrop-blur-sm border border-white/20 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="TikTok"
                >
                  <FaTiktok className="w-3 h-3 tiny:w-3.5 tiny:h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white hover:text-cyan-400 transition-colors duration-300" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-cyan-500/20 backdrop-blur-sm border border-white/20 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="Facebook"
                >
                  <FaFacebook className="w-3 h-3 tiny:w-3.5 tiny:h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white hover:text-cyan-400 transition-colors duration-300" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Section with Slideshow */}
      <section 
        className="relative w-full overflow-hidden py-6 tiny:py-8 xs:py-10 sm:py-12 md:py-16 lg:py-20 bg-gray-50 dark:bg-black"
        style={{
          marginTop: '-1px', // Overlap by 1px to eliminate border line
        }}
        onMouseEnter={() => setIsAnnouncementAutoPlaying(false)}
        onMouseLeave={() => setIsAnnouncementAutoPlaying(true)}
      >
        {/* Animated background particles - always visible */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-cyan-500/10 animate-float"
              style={{
                width: `${40 + i * 15}px`,
                height: `${40 + i * 15}px`,
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-2 tiny:px-4 xs:px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 relative z-10">
          {announcementsLoading ? (
            <div className="relative min-h-[150px] tiny:min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center justify-center">
              <div className="text-gray-600 dark:text-white/60 text-sm tiny:text-base xs:text-lg">{t('home.announcements.loading', 'Loading announcements...')}</div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="relative min-h-[150px] tiny:min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center justify-center overflow-hidden">
              
              {/* Main content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-2 tiny:px-4">
                {/* Animated icon with glow effect */}
                <div className="relative mb-4 tiny:mb-6">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  
                  {/* Icon container */}
                  <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full p-4 tiny:p-6 xs:p-8 sm:p-10 border-2 border-cyan-500/30 backdrop-blur-sm">
                    <Megaphone className="w-8 h-8 tiny:w-12 tiny:h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 text-cyan-400 animate-bounce" style={{ animationDuration: '2s' }} />
                  </div>
                  
                  {/* Rotating rings */}
                  <div className="absolute -inset-2 border-2 border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '8s' }}></div>
                  <div className="absolute -inset-4 border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}></div>
                </div>
                
                {/* Text with gradient animation */}
                <h3 className="text-base tiny:text-xl xs:text-2xl sm:text-3xl font-bold mb-2 tiny:mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                  {t('home.announcements.no_announcements', 'No announcements available')}
                </h3>
                <p className="text-gray-600 dark:text-white/50 text-xs tiny:text-sm xs:text-base max-w-md">
                  {t('home.announcements.no_announcements_subtitle', 'Check back soon for exciting updates and news!')}
                </p>
                
                {/* Animated dots loader */}
                <div className="flex gap-2 mt-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"
                      style={{
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: '1.5s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative min-h-[150px] tiny:min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center">
                {/* Announcements Slideshow */}
                {announcements.map((announcement, index) => (
                  <div
                    key={announcement._id}
                    className={`absolute inset-0 w-full transition-opacity duration-1000 ease-in-out flex items-center ${
                      index === currentAnnouncementIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                    style={{
                      willChange: index === currentAnnouncementIndex ? 'opacity' : 'auto',
                    }}
                  >
                    <div className="w-full space-y-2 tiny:space-y-3 xs:space-y-3.5 sm:space-y-4 md:space-y-5 lg:space-y-6">
                      {/* Date */}
                      <div 
                        className="text-gray-600 dark:text-white/60 text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg font-medium"
                        style={{
                          textShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        {announcement.date}
                      </div>
                      
                      {/* Announcement Title */}
                      <h2 
                        className="text-gray-900 dark:text-white font-bold leading-tight mb-2 tiny:mb-3 xs:mb-3.5 sm:mb-4 md:mb-5"
                        style={{
                          fontSize: 'clamp(0.875rem, 3vw + 0.5rem, 2.25rem)',
                          textShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
                          lineHeight: '1.2',
                        }}
                      >
                        {i18n.language === 'tg' ? announcement.title.tg : announcement.title.en}
                      </h2>
                      
                      {/* Announcement Content */}
                      <p 
                        className="text-gray-700 dark:text-white/90 leading-relaxed max-w-4xl line-clamp-3 tiny:line-clamp-4 xs:line-clamp-5 sm:line-clamp-6"
                        style={{
                          fontSize: 'clamp(0.75rem, 2vw + 0.25rem, 1.125rem)',
                          textShadow: '0 1px 10px rgba(0, 0, 0, 0.1)',
                          lineHeight: '1.6',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {i18n.language === 'tg' ? announcement.content.tg : announcement.content.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Announcement indicators */}
              {announcements.length > 1 && (
                <div className="flex justify-center gap-1.5 tiny:gap-2 mt-4 tiny:mt-6 xs:mt-7 sm:mt-8 md:mt-10">
                  {announcements.map((announcement, index) => (
                    <button
                      key={announcement._id}
                      onClick={() => {
                        setCurrentAnnouncementIndex(index);
                        setIsAnnouncementAutoPlaying(false);
                        setTimeout(() => setIsAnnouncementAutoPlaying(true), 8000);
                      }}
                      className={`h-1 tiny:h-1.5 xs:h-2 rounded-full transition-all duration-300 ${
                        index === currentAnnouncementIndex 
                          ? 'w-5 tiny:w-6 xs:w-8 bg-cyan-500 dark:bg-white' 
                          : 'w-1 tiny:w-1.5 xs:w-2 bg-cyan-500/40 dark:bg-white/40 hover:bg-cyan-500/60 dark:hover:bg-white/60'
                      }`}
                      aria-label={t('home.announcements.go_to_announcement', 'Go to announcement {{number}}', { number: index + 1 })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Investing Quotes Slideshow */}
      <section 
        className="relative w-full overflow-hidden py-6 tiny:py-8 xs:py-10 sm:py-12 md:py-16 bg-gray-50 dark:bg-gray-900"
        onMouseEnter={() => setIsQuoteAutoPlaying(false)}
        onMouseLeave={() => setIsQuoteAutoPlaying(true)}
      >
        <div className="max-w-4xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="relative min-h-[80px] tiny:min-h-[100px] xs:min-h-[120px] sm:min-h-[150px] md:min-h-[180px] lg:min-h-[200px]">
            {investingQuotes.map((quote, index) => (
              <div
                key={index}
                className={`text-center transition-opacity duration-1000 ease-in-out absolute inset-0 flex flex-col items-center justify-center gap-2 tiny:gap-3 xs:gap-4 sm:gap-5 md:gap-6 ${
                  index === currentQuoteIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                style={{
                  willChange: index === currentQuoteIndex ? 'opacity' : 'auto',
                }}
              >
                <blockquote className="text-sm tiny:text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-gray-900 dark:text-white leading-relaxed px-2 tiny:px-3 xs:px-4 sm:px-6">
                  "{quote.en}"
                </blockquote>
                <blockquote className="text-xs tiny:text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-700 dark:text-white/80 leading-relaxed px-2 tiny:px-3 xs:px-4 sm:px-6 italic">
                  "{quote.tg}"
                </blockquote>
              </div>
            ))}
          </div>
          
          {/* Quote indicators */}
          <div className="flex justify-center gap-1.5 tiny:gap-2 mt-3 tiny:mt-4 xs:mt-5 sm:mt-6 md:mt-8">
            {investingQuotes.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentQuoteIndex(index);
                  setIsQuoteAutoPlaying(false);
                  setTimeout(() => setIsQuoteAutoPlaying(true), 8000);
                }}
                className={`h-1 tiny:h-1.5 xs:h-2 rounded-full transition-all duration-300 ${
                  index === currentQuoteIndex 
                    ? 'w-5 tiny:w-6 xs:w-8 bg-cyan-500 dark:bg-white' 
                    : 'w-1 tiny:w-1.5 xs:w-2 bg-cyan-500/40 dark:bg-white/40 hover:bg-cyan-500/60 dark:hover:bg-white/60'
                }`}
                aria-label={`Go to quote ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 tiny:mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 pb-0.5 tiny:pb-1 sm:pb-2">
              {t('home.courses_title', 'Courses')}
            </h2>
            <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-white/80 max-w-2xl mx-auto px-2 tiny:px-3 xs:px-4">
              {t('home.courses_subtitle', 'Explore our collection of courses designed to accelerate your professional development')}
            </p>
          </div>
          {featuredGrid}
          <div className="text-center mt-4 tiny:mt-6 xs:mt-8 sm:mt-10 md:mt-12">
            <Link
              to="/courses"
              className="group relative inline-flex items-center space-x-1 tiny:space-x-1.5 xs:space-x-2 bg-white text-blue-600 px-3 tiny:px-4 xs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl overflow-hidden"
              style={{
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
              }}
            >
              {/* Animated gradient background */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-gradient-shift" />
              
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              {/* Glow effect */}
              <span className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-500 -z-10" />
              
              <span className="relative z-10 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 text-blue-600 group-hover:text-white transition-colors duration-300">
                {t('home.view_all_courses')}
                <ArrowRight className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Bundles Section */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 tiny:mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 pb-0.5 tiny:pb-1 sm:pb-2">
              {t('home.bundles_title', 'Course Bundles')}
            </h2>
            <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-white/80 max-w-2xl mx-auto px-2 tiny:px-3 xs:px-4">
              {t('home.bundles_subtitle', 'Save money with our curated course bundles. Get multiple courses at a discounted price.')}
            </p>
          </div>
          
          {/* Featured Bundles Grid - Full width for horizontal cards */}
          {bundlesLoading ? (
            <div className="grid grid-cols-1 gap-3 tiny:gap-4 xs:gap-5 sm:gap-6 md:gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3 tiny:p-4 sm:p-6 h-40 tiny:h-48 sm:h-56 border border-gray-200 dark:border-gray-700" />
              ))}
            </div>
          ) : featuredBundles.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 tiny:gap-4 xs:gap-5 sm:gap-6 md:gap-8">
              {featuredBundles.slice(0, 3).map((bundle) => (
                <BundleCard 
                  key={bundle._id} 
                  bundle={{
                    id: bundle._id,
                    title: bundle.title,
                    description: bundle.description,
                    longDescription: bundle.longDescription,
                    price: bundle.price,
                    originalValue: bundle.originalValue,
                    courseIds: bundle.courseIds.map(c => typeof c === 'object' ? c._id : c),
                    thumbnailURL: bundle.thumbnailURL,
                    category: bundle.category,
                    featured: bundle.featured,
                    maxEnrollments: bundle.maxEnrollments,
                    totalEnrollments: bundle.totalEnrollments,
                    hasReachedMaxEnrollments: bundle.hasReachedMaxEnrollments,
                    isPurchased: bundle.isPurchased || false
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {t('home.no_bundles_available', 'No featured bundles available at this time.')}
            </div>
          )}
          
          {/* View All Bundles Button */}
          <div className="text-center mt-4 tiny:mt-6 xs:mt-8 sm:mt-10 md:mt-12">
            <Link
              to="/bundles"
              className="group relative inline-flex items-center space-x-1 tiny:space-x-1.5 xs:space-x-2 bg-white text-blue-600 px-3 tiny:px-4 xs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl overflow-hidden"
              style={{
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
              }}
            >
              {/* Animated gradient background */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-gradient-shift" />
              
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              {/* Glow effect */}
              <span className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-500 -z-10" />
              
              <span className="relative z-10 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 text-blue-600 group-hover:text-white transition-colors duration-300">
                {t('home.view_all_bundles', 'View All Bundles')}
                <ArrowRight className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits / Why Choose Us Section */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 tiny:mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 pb-0.5 tiny:pb-1 sm:pb-2">
              {t('home.why_choose_title', 'Why Choose Us')}
            </h2>
            <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-white/80 max-w-2xl mx-auto px-2 tiny:px-3 xs:px-4">
              {t('home.why_choose_subtitle', 'Discover what makes Ibyet Investing the best choice for your financial education journey')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tiny:gap-4 xs:gap-5 sm:gap-6 md:gap-8">
            {[
              {
                icon: BookOpen,
                title: t('home.benefit_expert_instructors', 'Expert Instructors'),
                description: t('home.benefit_expert_instructors_desc', 'Learn from industry professionals with years of real-world trading and investment experience')
              },
              {
                icon: Award,
                title: t('home.benefit_certified_courses', 'Certified Courses'),
                description: t('home.benefit_certified_courses_desc', 'Earn recognized certificates upon completion to boost your professional credentials')
              },
              {
                icon: Clock,
                title: t('home.benefit_flexible_learning', 'Flexible Learning'),
                description: t('home.benefit_flexible_learning_desc', 'Study at your own pace with lifetime access to course materials and updates')
              },
              {
                icon: Users,
                title: t('home.benefit_community', 'Active Community'),
                description: t('home.benefit_community_desc', 'Join thousands of students and investors sharing knowledge and strategies')
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-3 tiny:p-4 xs:p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 text-center border border-gray-200 dark:border-gray-700/50 hover:border-cyan-500/50"
              >
                <div className="w-8 h-8 tiny:w-10 tiny:h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 tiny:mb-3 xs:mb-4 sm:mb-5 md:mb-6 transition-all duration-500"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 191, 255, 0.1) 100%)',
                }}>
                  <benefit.icon className="h-4 w-4 tiny:h-5 tiny:w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-colors duration-500" style={{ color: '#00BFFF' }} />
                </div>
                <h3 className="text-sm tiny:text-base xs:text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-500">{benefit.title}</h3>
                <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 tiny:mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 pb-0.5 tiny:pb-1 sm:pb-2">
              {t('home.faq.title', 'Frequently Asked Questions')}
            </h2>
            <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg text-gray-600 dark:text-white/80 max-w-2xl mx-auto px-2 tiny:px-3 xs:px-4">
              {t('home.faq.subtitle', 'Find answers to common questions about our courses and platform')}
            </p>
          </div>
          
          <div className="space-y-3 tiny:space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-8">
            {[
              {
                question: t('home.faq.questions.get_started.question', 'How do I get started?'),
                answer: t('home.faq.questions.get_started.answer', 'Simply create a free account, browse our courses, and enroll in any course that interests you. You can start learning immediately after enrollment.')
              },
              {
                question: t('home.faq.questions.final_purchases.question', 'Are the courses one-time purchases?'),
                answer: t('home.faq.questions.final_purchases.answer', 'Yes! Once you purchase a course, you get lifetime access to all course materials, including future updates and new content.')
              },
              {
                question: t('home.faq.questions.mobile.question', 'Can I access courses on mobile devices?'),
                answer: t('home.faq.questions.mobile.answer', 'Absolutely! Our platform is fully responsive and works seamlessly on all devices including smartphones and tablets.')
              }
            ].map((faq, index) => (
              <div 
                key={index}
                className="group bg-white dark:bg-gray-800 p-3 tiny:p-4 xs:p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700/50 hover:border-cyan-500/50"
              >
                <h3 className="text-sm tiny:text-base xs:text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-500 flex items-start xs:items-center">
                  <HelpCircle className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 mr-1.5 tiny:mr-2 xs:mr-3 mt-0.5 xs:mt-0 flex-shrink-0 transition-colors duration-500" style={{ color: '#00BFFF' }} />
                  <span>{faq.question}</span>
                </h3>
                <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed pl-5 tiny:pl-6 xs:pl-7 sm:pl-8 md:pl-9 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-500">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 tiny:mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 xs:mb-3 sm:mb-4 pb-0.5 tiny:pb-1 sm:pb-2">
              {t('home.success_stories_title', 'Success Stories')}
            </h2>
            <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-white/80 max-w-2xl mx-auto px-2 tiny:px-3 xs:px-4">
              {t('home.success_stories_subtitle', 'Hear from our students who have transformed their financial future')}
            </p>
          </div>
          
          {/* Infinite Scrolling Container */}
          <div className="relative overflow-hidden">
            <style>{`
              @keyframes scroll {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(calc(-100% / 3));
                }
              }
              .testimonials-scroll {
                will-change: transform;
                width: fit-content;
                animation: scroll 80s linear infinite;
              }
              @media (min-width: 640px) {
                .testimonials-scroll {
                  animation: scroll 100s linear infinite;
                }
              }
              @media (min-width: 1024px) {
                .testimonials-scroll {
                  animation: scroll 120s linear infinite;
                }
              }
              .testimonials-scroll:hover {
                animation-play-state: paused;
              }
              .testimonial-text-truncate-full {
                display: -webkit-box !important;
                -webkit-line-clamp: 8;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                text-overflow: ellipsis;
                word-wrap: break-word;
                word-break: break-word;
                line-height: 1.5 !important;
                max-height: calc(1.5em * 8 * 1.5);
                overflow-wrap: break-word;
                box-sizing: border-box;
                width: 100%;
                /* Force ellipsis to show */
                -webkit-box-flex: 0;
              }
              @media (min-width: 475px) {
                .testimonial-text-truncate-full {
                  -webkit-line-clamp: 9;
                  max-height: calc(1.5em * 9 * 1.5);
                }
              }
              @media (min-width: 640px) {
                .testimonial-text-truncate-full {
                  -webkit-line-clamp: 10;
                  max-height: calc(1.5em * 10 * 1.5);
                }
              }
              @media (min-width: 1024px) {
                .testimonial-text-truncate-full {
                  -webkit-line-clamp: 10;
                  max-height: calc(1.5em * 10 * 1.5);
                }
              }
              .testimonial-text-truncate-full-tg {
                display: -webkit-box;
                -webkit-line-clamp: 8;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                word-wrap: break-word;
                word-break: break-word;
                line-height: 1.5;
                max-height: calc(1.5em * 8);
              }
              @media (min-width: 475px) {
                .testimonial-text-truncate-full-tg {
                  -webkit-line-clamp: 9;
                  max-height: calc(1.5em * 9);
                }
              }
              @media (min-width: 640px) {
                .testimonial-text-truncate-full-tg {
                  -webkit-line-clamp: 10;
                  max-height: calc(1.5em * 10);
                }
              }
              @media (min-width: 1024px) {
                .testimonial-text-truncate-full-tg {
                  -webkit-line-clamp: 10;
                  max-height: calc(1.5em * 10);
                }
              }
            `}</style>
            <div className="flex testimonials-scroll">
              {/* Render testimonials 3 times for seamless infinite loop */}
              {[1, 2, 3].map((setIndex) => (
                [
                  {
                    name: 'Yonas Mesmer',
                    image: yonasMesmerImage,
                    contentEn: '',
                    contentTg: 'ኣነ ንኤማ ከም ኩሉ ሰብ ኣብ Youtube ን ኣብ Tiktok እየ ዝፈጦ ተከታታሊ ናይ ibyet investing እየ። እዚ ጥራይ ግን ንዓይ እኩል ኮይኑ ኣይ ነበረን ኣብ ወብሳይቱ ንዝበለጸ ትምህርቲ ንዓይ የገድሰኒ እዩ ዝበልክዎ ኮርስ ብዛዕባ stock market ካብ ትጽቢተይ ንላዕሊ ፍልጠት ቀሲመ ። ዝኮነ ሰብ ኣተሓሕዛ ገንዘብ ከምኡ ውን ገንዘብ ብከመይ ይሰርሕ ፡ stock valuation ብኸመይ ትገብሮ ፡ዝብል ቡሉጽ ትምህርቲ ዝኮነ ክወስ ዶ ዘለዎ ናይ stock Market ትምህርቲ ፡ ከምኡ ዉን ከመይ ገርካ ዝበለጸ ብርኪ ብኣፍልጦ ትመርጽ ibyet investing ይኩን ምርጫኩም።',
                    rating: 5
                  },
                  {
                    name: 'Frezghi Kasa',
                    image: frezgikasaImage,
                    contentEn: 'Ema\'s investment course is fantastic, covering everything from beginner to advanced levels. It includes personal finance, stock market strategies, investment psychology, and how markets work. If you\'re just starting, you\'re lucky to find such a great teacher. If you\'re an advanced investor, you\'re lucky to have Emas guidance. Thank you, Ema, for all your teachings. Wishing you all the best in your investment journey!',
                    contentTg: '',
                    rating: 5
                  },
                  {
                    name: 'Abraham Tesfay',
                    image: abrhamtesfayImage,
                    contentEn: '',
                    contentTg: 'ሰላም ዝኸበርካ ሓውና ኣማንኤል፡ ብመጀመርታ ንዓና ክትሕግዝ ኣብ መገዲ ዓውት ከተሳሊ፡ኩቡር ግዜካን ጉልበትካን ከይበቀቅካ ንዝነበረካ ፍልጠት ፍልጠት ብምድራዕ ዘዳለኻዮ ትምህርቲ ኣተየ ተማሂረ ኣብዚ ደረጃ ዚ ስለ ዝበጻሕኩ ኣዝየ ከመስግነካ ይደሊ። ብምቅጻል ከኣ በዚ ትምህርቲ ይኣኽለኩም ከይበልካ ዘለና ሕቶታት ተገዲስካ ትምልሳልና ውን ስለዘለካ ኣዝየ የመስግነካ። ቀጻሊ ክኸውን ከኣ ዘለኒ ተስፋ ይገልጸልካ። ብዝተረፈ ጊን አቲ ኮርስ ኣዝዩ መሳጢ ንዝነበረኒ ንኡስ ፍልጠት ኣራቢሑለይ ኣሎ ። ስለዚ ኩሉ ሕብረተሰብና ክመሃር ምስ ህዝቢ ውን ብዝበለጸ ትላለየሉ መድረኽ ክትፈጥር ፡ጽቡቅ ዩ። ኣጆካ ቀጽሎ ብዙሓት ክረብሕሉ ዝኽአል ትምህርቲ ኢኻ ቀሪብካ ዘለኻ።',
                    rating: 5
                  },
                  {
                    name: 'Haile Tekie',
                    image: hailetekieImage,
                    contentEn: 'This course is very clear, well-structured, and detailed. The explanations are easy to understand, and the progression of topics makes learning smooth and effective. Please keep going with this approach.',
                    contentTg: '',
                    rating: 5
                  },
                  {
                    name: 'Amanuel Mengsteab',
                    image: amanuelmengisteabImage,
                    contentEn: 'This course provides economically transformative knowledge with significant real-world impact. Thank you, EMA, for making this valuable learning accessible.',
                    contentTg: '',
                    rating: 5
                  },
                  {
                    name: 'Teame Debesay',
                    image: teamedebesayImage,
                    contentEn: 'Thanks for sharing this! The information is very helpful and interesting, and I really appreciate the time and effort you put into providing it.',
                    contentTg: '',
                    rating: 5
                  },
                  {
                    name: 'Gilagabr Mengisteab',
                    image: null,
                    contentEn: '',
                    contentTg: 'ብመጀመርታ ንክቡር ሓውና መምህር ኣማኑኤል ነቲ ካብ ዉልቃዊ ተመኩሮኡን ነቲ ከም ፈለግ ዝዉሕዝ ፍልጠቱን ነዓና የሕዋቱ ከካፍለናን ተጠቀምቲ ነቲ ዘሎ ጸጋታት ክንከዉን ብምሉእ ሓይሉ ዝቃለስ ዘሎን እሞ ድማ ባዕሉ ፈቲኑ ዉጺኢታዊ ምካኑ ፈሊጡ ምሳይ ተጠቀሙ ዝብል ኣጆኩም ሓቢርና ንዕበ ዝብል መምህር ልባዊ ምስጋና ከመስግኖ ይፈቱ ።ብምቅጻል ኣነ ተጠቃሚ ወፍሪ Stock Market ክኽውን በቂዓ ኣለኩ። ብዓቢኡ ከኣ ንሱ ጥራሕ ዘይኩንኩ ተማሂረ ብከመይ ገንዘበይ ከምዝዕቅብን ከምዘዋፍርን ስልጡን ዝኮነ ኾርስ ብዘየዳግም ተማሂረ ኣለኩ ።ነቲ ዝተጠቀምኩሉ ይምስክርን ኩሉ ኪጥቀመሉ ድም የተሓሳስብ ። ብመሰረቱ ዉን ንኩሉ ክጥቀመሉ ክፊት ስለ ዝኮነ ንዓና ምካኑ ፈሊጥና ነዚ ኮርስ ክንመሃር ኣለና ። ነዚ ዕብየት ዝብል ናይብሓቂ ናይ ዕብየት ትምህርቲ እዩ ኩላትና ተጠቀምቲ ክንከውን ደጊመ ሓደራ ይብል ።',
                    rating: 5
                  },
                  {
                    name: 'Mengsteab Gebrezgabiher',
                    image: null,
                    contentEn: 'Dear Amanuel (Ibyet) I want to thank you for all you have taught me in Finance( stock market in general and crypto currency from baisci to advance) . The knowlege and wisdom you have imparted upon me will be a great help and support for my future. You have been an excellent friend,teacher,mentor and a great inspiration for me.You have inspired me to pursue my goals with hard work and dedication. You have shown me the value of finance (stock market) in Business. I really appreciate and value everything i have learned from you.It will forever remain a major contributor behind my success and achievements. I highly recommend for new students benefit from your great Mentorship. Sincerely Mengs G/biher',
                    contentTg: '',
                    rating: 5
                  },
                  {
                    name: 'Alazar',
                    image: null,
                    contentEn: '',
                    contentTg: 'አብዘን ብተከታታሊ ንሓያሎ ሳምንታት ብተገዳስነት ግዜኻን ፍልጠትካን ወፊኻ ንዝሓብካና ናይ ወፍሪ ስልጠና ብኸመይን መዓስን ነውፍር ? ከምኡውን ነቲ ዝረኸብናዮ/ሰራሕና ዘምጻናዮ ገንዘብ ብከመይ ንቆጻጸሮን ነመሓድሮን ፣ብተወሳኺውን አብ ወፍሪ ንዘነበረና አተሓሳስባ ንክዓቢ ፣ አብ ግዜ ላዕልን ታሕትን ናይ ዕዳጋ ምግምጣል ርጉዕ አዕምሮ ንክንሕልወና ንዝሓብካና ዓሚቕ ፍልጠት ከመስግን ይፈቱ። ሕብረተሰብና ንክምዕብል አብዚ ፍሉይ ዓውዲ ንእትገብሮ ጻዕሪ ከመስግነካ ይፈቱ። ብውሑዳት ዝጀመርካዮ ብዙሓት ክረብሕሉ ዝክእሉ ትምህርቲ ኢኻ ቀሪብካ ዘሎካ እም አጆኻ ቀጽል።',
                    rating: 5
                  },
                  {
                    name: 'Letekidan Tekle',
                    image: null,
                    contentEn: '',
                    contentTg: 'ሰላም ኣማኒአል መጀምርያ የመስግነካ በቲ አቲህበና ፍልጠትካን ግዘካን ከይበቀቅካ ሕቶታትና ክትምልስ ካብኡ ዝሃለፈ ውን አቲ ትምህርቲ ብኣዝዩ ጥበባውን ርዱኡን ኣቀራርባ ኣሎካ ።ኣነ ብወገነይ ኣዝየ አየ ዕግብቲ በዚ ረኪበዮ ዘለኩ ፍልጠት ንዓይ ሓደ ስጉምቲ ንቅድሚት አዩ ስለዚ ሕጅውን ደጊመ የመስግነካ ዕድመን ፡ጥዕናን፡ሰላምን ይምነየልካ ምስ ስድራካኩቡር ሓዊ።',
                    rating: 5
                  }
                ].map((testimonial, index) => (
                  <div
                    key={`set-${setIndex}-${index}`}
                    className="flex-shrink-0 w-[95vw] tiny:w-[90vw] xs:w-[85vw] sm:w-[45vw] md:w-[400px] lg:w-[450px] px-2 tiny:px-3 xs:px-4"
                  >
                    <div className="bg-gray-700 dark:bg-gray-700 p-2.5 tiny:p-3 xs:p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 border border-gray-600 dark:border-gray-600 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 h-full flex flex-col max-h-[240px] tiny:max-h-[280px] xs:max-h-[300px] sm:max-h-[320px] md:max-h-[340px]">
                      <div className="flex items-center mb-1.5 tiny:mb-2 xs:mb-2.5 flex-shrink-0">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 tiny:h-3 tiny:w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <div className="mb-1.5 tiny:mb-2 xs:mb-2.5 space-y-1 tiny:space-y-1.5 xs:space-y-2 flex-1 overflow-hidden min-h-0">
                        {testimonial.contentEn && (
                          <p className="text-[9px] tiny:text-[10px] xs:text-xs sm:text-sm text-gray-200 testimonial-text-truncate-full">
                            "{testimonial.contentEn}"
                          </p>
                        )}
                        {testimonial.contentTg && (
                          <p className="text-[9px] tiny:text-[10px] xs:text-xs sm:text-sm text-gray-300/80 leading-relaxed italic testimonial-text-truncate-full-tg">
                            "{testimonial.contentTg}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center mt-auto flex-shrink-0">
                        {testimonial.image ? (
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name}
                            className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover mr-1.5 tiny:mr-2 xs:mr-2.5 sm:mr-3 flex-shrink-0 border-2 border-cyan-500/30"
                          />
                        ) : (
                          <div className="w-6 h-6 tiny:w-7 tiny:h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-1.5 tiny:mr-2 xs:mr-2.5 sm:mr-3 text-white font-bold text-[10px] tiny:text-xs xs:text-sm sm:text-base flex-shrink-0 border-2 border-cyan-500/30">
                            {testimonial.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white text-[10px] tiny:text-xs xs:text-sm sm:text-base truncate">{testimonial.name}</div>
                          <div className="text-gray-400 text-[9px] tiny:text-[10px] xs:text-xs sm:text-sm truncate">{t('home.student', 'Student')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6 tiny:py-10 xs:py-12 sm:py-16 md:py-20 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.1) 0%, rgba(147, 112, 219, 0.1) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20"></div>
        <div className="max-w-4xl mx-auto text-center px-2 tiny:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
          <h2 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 tiny:mb-3 xs:mb-4 sm:mb-5 md:mb-6 pb-1 tiny:pb-2 sm:pb-3 md:pb-4 text-gray-900 dark:text-white">
            {t('home.cta_title', 'Ready to Start Your Investment Journey?')}
          </h2>
          <p className="text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl mb-4 tiny:mb-5 xs:mb-6 sm:mb-7 md:mb-8 text-gray-700 dark:text-white/90 px-2 tiny:px-3 xs:px-4">
            {t('home.cta_subtitle', 'Join thousands of students learning to master the art of investing and trading')}
          </p>
          <div className="flex flex-col xs:flex-row gap-2 tiny:gap-2.5 xs:gap-3 sm:gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-4 tiny:px-5 xs:px-6 sm:px-7 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 ease-in-out transform hover:scale-110 shadow-xl hover:shadow-2xl text-white border-2 whitespace-nowrap"
              style={{
                backgroundColor: '#00BFFF',
                borderColor: '#00BFFF',
                boxShadow: '0 20px 25px -5px rgba(0, 191, 255, 0.3), 0 10px 10px -5px rgba(0, 191, 255, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00CED1';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 191, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#00BFFF';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 191, 255, 0.3), 0 10px 10px -5px rgba(0, 191, 255, 0.2)';
              }}
            >
              {t('home.cta_button', 'Get Started Free')}
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center px-4 tiny:px-5 xs:px-6 sm:px-7 md:px-8 py-2 tiny:py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-[10px] tiny:text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 ease-in-out transform hover:scale-110 border-2 text-white hover:bg-white/10 backdrop-blur-sm whitespace-nowrap"
              style={{
                borderColor: '#00BFFF',
              }}
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