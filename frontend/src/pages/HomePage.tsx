import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Award, Users, Clock, Star, HelpCircle, Mail, CheckCircle, Megaphone } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import BundleCard from '../components/BundleCard';
import LoadingMessage from '../components/LoadingMessage';
import { useFeaturedCourses } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';
import { useFeaturedBundles } from '../hooks/useBundles';
import { buildApiUrl } from '../config/environment';
import heroImage from '../assets/images/hero-image.jpeg';

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
  
  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  
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


  // TEMPORARILY HIDDEN - Testimonials data
  // const testimonials = [
  //   {
  //     name: t('home.testimonials.jessica.name'),
  //     role: t('home.testimonials.jessica.role'),
  //     content: t('home.testimonials.jessica.content'),
  //     avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  //     rating: 5
  //   },
  //   {
  //     name: t('home.testimonials.david.name'),
  //     role: t('home.testimonials.david.role'),
  //     content: t('home.testimonials.david.content'),
  //     avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  //     rating: 5
  //   },
  //   {
  //     name: t('home.testimonials.maria.name'),
  //     role: t('home.testimonials.maria.role'),
  //     content: t('home.testimonials.maria.content'),
  //     avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  //     rating: 5
  //   }
  // ];


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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl shadow p-6 h-64 sm:h-72" />
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
    
    // Rendering featured course cards
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
  }, [featuredCourses, coursesLoading, coursesError, t]);


  return (
    <div>
      {/* Hero Section - Full Width Image with Overlay Text */}
      <section 
        className="relative min-h-screen flex items-center overflow-hidden w-full"
      >
        {/* Full Width Hero Image Background */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={heroImage} 
            alt="Hero" 
            className="w-full h-full object-cover object-right md:object-center"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 container mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-12 2xl:px-16 w-full">
          <div className="flex flex-col justify-center space-y-2.5 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 max-w-2xl lg:max-w-3xl xl:max-w-4xl pt-4 xs:pt-6 sm:pt-8 md:pt-10 lg:pt-12 xl:pt-16 pb-12 xs:pb-16 sm:pb-20 md:pb-24">
            {/* Big Title with Gradient */}
            <h1 
              className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight xs:leading-tight sm:leading-tight pt-8 xs:pt-10 sm:pt-12 md:pt-16 lg:pt-20 xl:pt-24 pb-2 xs:pb-3 sm:pb-4"
              style={{
                background: 'linear-gradient(to right, #00BFFF 0%, #00BFFF 40%, #9370DB 60%, #9370DB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('home.hero_main_title')}
            </h1>

            {/* Bullet Points */}
            <div className="space-y-1.5 xs:space-y-2 sm:space-y-2.5 md:space-y-3">
              {[
                t('home.hero_bullet_1'),
                t('home.hero_bullet_2'),
                t('home.hero_bullet_3'),
              ].map((text, index) => (
                <div key={index} className="flex items-start gap-2 xs:gap-2.5 sm:gap-3">
                  <div
                    className="w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 mt-1.5 xs:mt-2"
                    style={{ backgroundColor: '#00BFFF' }}
                  />
                  <p className="text-white/90 text-xs xs:text-sm sm:text-base md:text-lg leading-relaxed drop-shadow-lg">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col xs:flex-row gap-2.5 xs:gap-3 sm:gap-4 pt-1 xs:pt-2">
              <Link
                to="/courses"
                className="px-4 xs:px-5 sm:px-6 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 text-xs xs:text-sm sm:text-base font-semibold text-white rounded-lg text-center transition-all hover:opacity-90 hover:scale-105 active:scale-95 whitespace-nowrap shadow-lg"
                style={{ backgroundColor: '#00BFFF' }}
              >
                {t('home.view_all_courses', 'Explore Courses')}
              </Link>
              <Link
                to="/contact"
                className="px-4 xs:px-5 sm:px-6 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 text-xs xs:text-sm sm:text-base font-semibold rounded-lg text-center border-2 transition-all hover:bg-cyan-400/10 hover:scale-105 active:scale-95 whitespace-nowrap shadow-lg backdrop-blur-sm"
                style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
              >
                {t('home.contact_us', 'Get in Touch')}
              </Link>
            </div>

            {/* Social Proof */}
            <div className="pt-1.5 xs:pt-2 sm:pt-3">
              <p className="text-white/70 text-[10px] xs:text-xs sm:text-sm mb-1.5 xs:mb-2 drop-shadow-md">
                {t('home.hero_social_proof', 'Follow us here...')}
              </p>
              <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 p-1.5 xs:p-2 sm:p-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="Facebook"
                >
                  <FaFacebook className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="Instagram"
                >
                  <FaInstagram className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="Twitter"
                >
                  <FaTwitter className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                  aria-label="TikTok"
                >
                  <FaTiktok className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Section with Slideshow */}
      <section 
        className="relative w-full overflow-hidden py-8 xs:py-10 sm:py-12 md:py-16 lg:py-20"
        style={{
          background: 'rgba(0, 0, 0, 1)',
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
        
        <div className="max-w-7xl mx-auto px-4 xs:px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 relative z-10">
          {announcementsLoading ? (
            <div className="relative min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center justify-center">
              <div className="text-white/60 text-lg">{t('home.announcements.loading', 'Loading announcements...')}</div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="relative min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center justify-center overflow-hidden">
              
              {/* Main content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
                {/* Animated icon with glow effect */}
                <div className="relative mb-6">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  
                  {/* Icon container */}
                  <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full p-6 xs:p-8 sm:p-10 border-2 border-cyan-500/30 backdrop-blur-sm">
                    <Megaphone className="w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 text-cyan-400 animate-bounce" style={{ animationDuration: '2s' }} />
                  </div>
                  
                  {/* Rotating rings */}
                  <div className="absolute -inset-2 border-2 border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '8s' }}></div>
                  <div className="absolute -inset-4 border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}></div>
                </div>
                
                {/* Text with gradient animation */}
                <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                  {t('home.announcements.no_announcements', 'No announcements available')}
                </h3>
                <p className="text-white/50 text-sm xs:text-base max-w-md">
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
              <div className="relative min-h-[200px] xs:min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px] flex items-center">
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
                    <div className="w-full space-y-3 xs:space-y-3.5 sm:space-y-4 md:space-y-5 lg:space-y-6">
                      {/* Date */}
                      <div 
                        className="text-white/60 text-xs xs:text-sm sm:text-base md:text-lg font-medium"
                        style={{
                          textShadow: '0 1px 5px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        {announcement.date}
                      </div>
                      
                      {/* Announcement Title */}
                      <h2 
                        className="text-white font-bold leading-tight mb-3 xs:mb-3.5 sm:mb-4 md:mb-5"
                        style={{
                          fontSize: 'clamp(1.125rem, 3vw + 0.5rem, 2.25rem)',
                          textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
                          lineHeight: '1.2',
                        }}
                      >
                        {i18n.language === 'tg' ? announcement.title.tg : announcement.title.en}
                      </h2>
                      
                      {/* Announcement Content */}
                      <p 
                        className="text-white/90 leading-relaxed max-w-4xl"
                        style={{
                          fontSize: 'clamp(0.875rem, 2vw + 0.25rem, 1.125rem)',
                          textShadow: '0 1px 10px rgba(0, 0, 0, 0.5)',
                          lineHeight: '1.6',
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
                <div className="flex justify-center gap-2 mt-6 xs:mt-7 sm:mt-8 md:mt-10">
                  {announcements.map((announcement, index) => (
                    <button
                      key={announcement._id}
                      onClick={() => {
                        setCurrentAnnouncementIndex(index);
                        setIsAnnouncementAutoPlaying(false);
                        setTimeout(() => setIsAnnouncementAutoPlaying(true), 8000);
                      }}
                      className={`h-1.5 xs:h-2 rounded-full transition-all duration-300 ${
                        index === currentAnnouncementIndex 
                          ? 'w-6 xs:w-8 bg-white' 
                          : 'w-1.5 xs:w-2 bg-white/40 hover:bg-white/60'
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
        className="relative w-full overflow-hidden py-8 xs:py-10 sm:py-12 md:py-16"
        onMouseEnter={() => setIsQuoteAutoPlaying(false)}
        onMouseLeave={() => setIsQuoteAutoPlaying(true)}
      >
        <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="relative min-h-[100px] xs:min-h-[120px] sm:min-h-[150px] md:min-h-[180px] lg:min-h-[200px]">
            {investingQuotes.map((quote, index) => (
              <div
                key={index}
                className={`text-center transition-opacity duration-1000 ease-in-out absolute inset-0 flex flex-col items-center justify-center gap-3 xs:gap-4 sm:gap-5 md:gap-6 ${
                  index === currentQuoteIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                style={{
                  willChange: index === currentQuoteIndex ? 'opacity' : 'auto',
                }}
              >
                <blockquote className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white leading-relaxed px-3 xs:px-4 sm:px-6">
                  "{quote.en}"
                </blockquote>
                <blockquote className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-white/80 leading-relaxed px-3 xs:px-4 sm:px-6 italic">
                  "{quote.tg}"
                </blockquote>
              </div>
            ))}
          </div>
          
          {/* Quote indicators */}
          <div className="flex justify-center gap-2 mt-4 xs:mt-5 sm:mt-6 md:mt-8">
            {investingQuotes.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentQuoteIndex(index);
                  setIsQuoteAutoPlaying(false);
                  setTimeout(() => setIsQuoteAutoPlaying(true), 8000);
                }}
                className={`h-1.5 xs:h-2 rounded-full transition-all duration-300 ${
                  index === currentQuoteIndex 
                    ? 'w-6 xs:w-8 bg-white' 
                    : 'w-1.5 xs:w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to quote ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-10 xs:py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.courses_title', 'Courses')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto px-3 xs:px-4">
              {t('home.courses_subtitle', 'Explore our collection of courses designed to accelerate your professional development')}
            </p>
          </div>
          {featuredGrid}
          <div className="text-center mt-6 xs:mt-8 sm:mt-10 md:mt-12">
            <Link
              to="/courses"
              className="group relative inline-flex items-center space-x-1 xs:space-x-2 bg-white text-blue-600 px-4 xs:px-5 sm:px-6 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl overflow-hidden"
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
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.bundles_title', 'Course Bundles')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto px-3 xs:px-4">
              {t('home.bundles_subtitle', 'Save money with our curated course bundles. Get multiple courses at a discounted price.')}
            </p>
          </div>
          
          {/* Featured Bundles Grid */}
          {bundlesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 md:gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 h-64 sm:h-72 border border-gray-700" />
              ))}
            </div>
          ) : featuredBundles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 md:gap-8">
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
                    featured: bundle.featured
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {t('home.no_bundles_available', 'No featured bundles available at this time.')}
            </div>
          )}
          
          {/* View All Bundles Button */}
          <div className="text-center mt-6 xs:mt-8 sm:mt-10 md:mt-12">
            <Link
              to="/bundles"
              className="group relative inline-flex items-center space-x-1 xs:space-x-2 bg-white text-blue-600 px-4 xs:px-5 sm:px-6 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 hover:scale-110 hover:shadow-2xl overflow-hidden"
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
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.why_choose_title', 'Why Choose Us')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto px-3 xs:px-4">
              {t('home.why_choose_subtitle', 'Discover what makes our investment academy the best choice for your financial education journey')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xs:gap-5 sm:gap-6 md:gap-8">
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
                className="bg-gray-800 p-4 xs:p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 text-center border border-gray-700/50 hover:border-cyan-500/50"
              >
                <div className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4 sm:mb-5 md:mb-6 transition-all duration-500"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 191, 255, 0.1) 100%)',
                }}>
                  <benefit.icon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-colors duration-500" style={{ color: '#00BFFF' }} />
                </div>
                <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 group-hover:text-cyan-400 transition-colors duration-500">{benefit.title}</h3>
                <p className="text-xs xs:text-sm sm:text-base text-gray-300 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.faq.title', 'Frequently Asked Questions')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto px-3 xs:px-4">
              {t('home.faq.subtitle', 'Find answers to common questions about our courses and platform')}
            </p>
          </div>
          
          <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-8">
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
                className="group bg-gray-800 p-4 xs:p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 border border-gray-700/50 hover:border-cyan-500/50"
              >
                <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 group-hover:text-cyan-400 transition-colors duration-500 flex items-start xs:items-center">
                  <HelpCircle className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 mr-2 xs:mr-3 mt-0.5 xs:mt-0 flex-shrink-0 transition-colors duration-500" style={{ color: '#00BFFF' }} />
                  <span>{faq.question}</span>
                </h3>
                <p className="text-xs xs:text-sm sm:text-base text-gray-300 leading-relaxed pl-6 xs:pl-7 sm:pl-8 md:pl-9 group-hover:text-gray-200 transition-colors duration-500">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-8 xs:mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.success_stories_title', 'Success Stories')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto px-3 xs:px-4">
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
                  transform: translateX(-33.333%);
                }
              }
              .testimonials-scroll {
                animation: scroll 15s linear infinite;
              }
              @media (min-width: 640px) {
                .testimonials-scroll {
                  animation: scroll 25s linear infinite;
                }
              }
              @media (min-width: 1024px) {
                .testimonials-scroll {
                  animation: scroll 30s linear infinite;
                }
              }
              .testimonials-scroll:hover {
                animation-play-state: paused;
              }
            `}</style>
            <div className="flex testimonials-scroll">
              {/* Render testimonials 3 times for seamless infinite loop */}
              {[1, 2, 3].map((setIndex) => (
                [
                  {
                    name: t('home.testimonial_1_name', 'Michael Chen'),
                    role: t('home.testimonial_1_role', 'Professional Trader'),
                    content: t('home.testimonial_1_content', 'The advanced trading strategies course completely changed my approach to the markets. I\'ve increased my profitability by 300% in just 6 months!'),
                    rating: 5
                  },
                  {
                    name: t('home.testimonial_2_name', 'Sarah Johnson'),
                    role: t('home.testimonial_2_role', 'Investment Advisor'),
                    content: t('home.testimonial_2_content', 'The comprehensive curriculum and expert instructors helped me build a solid foundation in investing. Highly recommend to anyone serious about financial growth.'),
                    rating: 5
                  },
                  {
                    name: t('home.testimonial_3_name', 'David Martinez'),
                    role: t('home.testimonial_3_role', 'Portfolio Manager'),
                    content: t('home.testimonial_3_content', 'Best investment education platform I\'ve found. The real-world examples and practical exercises made all the difference in my learning journey.'),
                    rating: 5
                  }
                ].map((testimonial, index) => (
                  <div
                    key={`set-${setIndex}-${index}`}
                    className="flex-shrink-0 w-[90vw] xs:w-[85vw] sm:w-[45vw] md:w-[400px] lg:w-[450px] px-3 xs:px-4"
                  >
                    <div className="bg-gray-700/50 p-4 xs:p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 border border-gray-600/50 hover:border-cyan-500/50 h-full">
                      <div className="flex items-center mb-3 xs:mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-xs xs:text-sm sm:text-base text-gray-200 mb-3 xs:mb-4 sm:mb-5 md:mb-6 leading-relaxed italic">
                        "{testimonial.content}"
                      </p>
                      <div className="flex items-center">
                        <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 xs:mr-3 sm:mr-4 text-white font-bold text-xs xs:text-sm sm:text-base flex-shrink-0">
                          {testimonial.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs xs:text-sm sm:text-base truncate">{testimonial.name}</div>
                          <div className="text-gray-400 text-[10px] xs:text-xs sm:text-sm truncate">{testimonial.role}</div>
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
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.1) 0%, rgba(147, 112, 219, 0.1) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20"></div>
        <div className="max-w-4xl mx-auto text-center px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 xs:mb-4 sm:mb-5 md:mb-6 pb-2 sm:pb-3 md:pb-4 text-white">
            {t('home.cta_title', 'Ready to Start Your Investment Journey?')}
          </h2>
          <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl mb-5 xs:mb-6 sm:mb-7 md:mb-8 text-white/90 px-3 xs:px-4">
            {t('home.cta_subtitle', 'Join thousands of students learning to master the art of investing and trading')}
          </p>
          <div className="flex flex-col xs:flex-row gap-2.5 xs:gap-3 sm:gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-5 xs:px-6 sm:px-7 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 ease-in-out transform hover:scale-110 shadow-xl hover:shadow-2xl text-white border-2 whitespace-nowrap"
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
              className="inline-flex items-center justify-center px-5 xs:px-6 sm:px-7 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-xs xs:text-sm sm:text-base md:text-lg transition-all duration-500 ease-in-out transform hover:scale-110 border-2 text-white hover:bg-white/10 backdrop-blur-sm whitespace-nowrap"
              style={{
                borderColor: '#00BFFF',
              }}
            >
              {t('home.view_all_courses')}
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-10 xs:py-12 sm:py-16 md:py-20 bg-gray-800 border-t border-gray-700">
        <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="text-center mb-6 xs:mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full mb-3 xs:mb-4 sm:mb-5 md:mb-6 mx-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(0, 191, 255, 0.1) 100%)',
              }}
            >
              <Mail className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10" style={{ color: '#00BFFF' }} />
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 pb-1 sm:pb-2">
              {t('home.newsletter_title', 'Stay Updated with Investment Insights')}
            </h2>
            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-3 xs:px-4">
              {t('home.newsletter_subtitle', 'Subscribe to our newsletter and get the latest investment tips, market analysis, and exclusive course updates delivered to your inbox.')}
            </p>
          </div>

          <div className="max-w-lg mx-auto px-2 xs:px-3">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newsletterEmail || !newsletterEmail.includes('@')) {
                  setNewsletterStatus('error');
                  setNewsletterMessage(t('home.newsletter_invalid_email', 'Please enter a valid email address'));
                  return;
                }

                setNewsletterStatus('loading');
                setNewsletterMessage('');

                try {
                  const response = await fetch(buildApiUrl('/api/newsletter/subscribe'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: newsletterEmail, source: 'homepage' })
                  });

                  const result = await response.json();

                  if (response.ok && result.success) {
                    setNewsletterStatus('success');
                    setNewsletterMessage(t('home.newsletter_success', 'Thank you for subscribing! Check your email for confirmation.'));
                    setNewsletterEmail('');
                    
                    setTimeout(() => {
                      setNewsletterStatus('idle');
                      setNewsletterMessage('');
                    }, 5000);
                  } else {
                    setNewsletterStatus('error');
                    setNewsletterMessage(result.message || t('home.newsletter_error', 'Something went wrong. Please try again later.'));
                  }
                } catch (error) {
                  console.error('Newsletter subscription error:', error);
                  setNewsletterStatus('error');
                  setNewsletterMessage(t('home.newsletter_error', 'Something went wrong. Please try again later.'));
                }
              }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t('home.newsletter_placeholder', 'Enter your email address')}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                  disabled={newsletterStatus === 'loading'}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                className="px-6 sm:px-8 py-3 sm:py-4 font-semibold text-white rounded-lg transition-all duration-500 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
                style={{
                  backgroundColor: newsletterStatus === 'success' ? '#10b981' : '#00BFFF',
                  boxShadow: newsletterStatus === 'success' 
                    ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' 
                    : '0 10px 15px -3px rgba(0, 191, 255, 0.3)'
                }}
              >
                {newsletterStatus === 'loading' ? (
                  <>
                    <div className="w-4 h-4 xs:w-5 xs:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-xs xs:text-sm sm:text-base">{t('home.newsletter_subscribing', 'Subscribing...')}</span>
                  </>
                ) : newsletterStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 xs:w-5 xs:h-5" />
                    <span className="text-xs xs:text-sm sm:text-base">{t('home.newsletter_subscribed', 'Subscribed!')}</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 xs:w-5 xs:h-5" />
                    <span className="text-xs xs:text-sm sm:text-base">{t('home.newsletter_subscribe', 'Subscribe')}</span>
                  </>
                )}
              </button>
            </form>

            {newsletterMessage && (
              <div className={`mt-3 xs:mt-4 text-center text-xs xs:text-sm sm:text-base px-3 xs:px-4 py-2 rounded-lg transition-all duration-300 ${
                newsletterStatus === 'success' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {newsletterMessage}
              </div>
            )}

            <p className="text-[10px] xs:text-xs sm:text-sm text-gray-400 text-center mt-3 xs:mt-4 sm:mt-5 md:mt-6 px-2">
              {t('home.newsletter_privacy', 'We respect your privacy. Unsubscribe at any time.')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;