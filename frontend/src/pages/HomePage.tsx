import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Star, Award, Zap, Target, TrendingUp } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import LoadingMessage from '../components/LoadingMessage';
import { useFeaturedCourses } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';

// Import hero images
import heroImage1 from '../assets/images/pexels-davidmcbee-730547.jpg';
import heroImage2 from '../assets/images/pexels-dvaughnbell-2068664.jpg';
import heroImage3 from '../assets/images/pexels-karola-g-5980876.jpg';
import heroImage4 from '../assets/images/pexels-kindelmedia-7054384.jpg';
import heroImage5 from '../assets/images/pexels-michael-steinberg-95604-318820.jpg';
import heroImage6 from '../assets/images/pexels-n-voitkevich-6120218.jpg';
import heroImage7 from '../assets/images/pexels-pixabay-259091.jpg';


const HomePage = () => {
  const { t } = useTranslation();
  
  // Hero images array
  const heroImages = [
    heroImage1,
    heroImage2,
    heroImage3,
    heroImage4,
    heroImage5,
    heroImage6,
    heroImage7
  ];
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Track loaded images
  
  // Use React Query for fetching featured courses
  const { data: featuredCourses = [], isLoading: loading, error } = useFeaturedCourses();

  // Detect scroll direction - fade out when scrolling down, fade in from top when scrolling up
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > 50) {
            setHasScrolled(true);
          } else {
            setHasScrolled(false);
          }
          
          if (currentScrollY > lastScrollY && currentScrollY > 50) {
            // Scrolling down and past 50px
            setIsScrollingDown(true);
          } else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
            // Scrolling up or at top
            setIsScrollingDown(false);
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
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

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentImageIndex + 1) % heroImages.length;
    if (!loadedImages.has(nextIndex)) {
      const img = new Image();
      img.src = heroImages[nextIndex];
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, nextIndex]));
      };
    }
  }, [currentImageIndex, heroImages, loadedImages]);

  // Auto-rotate images
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, heroImages.length]);

  // Navigation functions
  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentImageIndex(index);
  };


  const featuredGrid = useMemo(() => {
    if (loading) {
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
  }, [featuredCourses, loading, error, t]);


  return (
    <div>
      {/* Image Hero Slideshow Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* IBYET Academy Label - Top Left */}
        <Link
          to="/"
          className={`fixed top-4 left-4 sm:top-8 sm:left-12 md:top-10 md:left-16 z-[98] flex items-center gap-1 sm:gap-2 group ${
            isScrollingDown 
              ? 'opacity-0 pointer-events-none' 
              : 'opacity-100'
          }`}
          style={{
            fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            transform: isScrollingDown 
              ? 'scale(1.2) translateY(-20px)' 
              : 'scale(1.2) translateY(0)',
            transformOrigin: 'top left',
            transition: isScrollingDown 
              ? 'opacity 0.3s ease-in, transform 0.3s ease-in' 
              : hasScrolled && !isScrollingDown && lastScrollY > 50
              ? 'none'
              : 'opacity 0.3s ease-out, transform 0.3s ease-out',
            animation: hasScrolled && !isScrollingDown && lastScrollY > 50 
              ? 'fadeInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards' 
              : 'none'
          }}
          aria-label="IBYET Academy"
        >
          {/* IBYET - with border and glow effects */}
          <span 
            className={`relative border border-white sm:border-2 backdrop-blur-sm text-white px-2 py-0.5 sm:px-4 sm:px-5 md:px-6 sm:py-1 sm:py-1.5 md:py-2 rounded-md font-bold text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl shadow-lg tracking-tight overflow-hidden ${
              !isScrollingDown ? 'animate-logo-border-glow animate-logo-pulse' : ''
            }`}
            style={{
              animationDelay: hasScrolled && !isScrollingDown && lastScrollY > 50 ? '0.8s' : '0s'
            }}
          >
            {/* Shimmer effect overlay */}
            <span className="absolute inset-0 animate-logo-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Gradient background */}
            <span className="absolute inset-0 animate-logo-gradient-shift opacity-20 rounded-md" />
            {/* Text with glow */}
            <span 
              className={`relative z-10 ${!isScrollingDown ? 'animate-logo-text-glow' : ''}`}
              style={{
                animationDelay: hasScrolled && !isScrollingDown && lastScrollY > 50 ? '0.8s' : '0s'
              }}
            >
              IBYET
            </span>
            {/* Animated border glow */}
            <span className="absolute -inset-0.5 rounded-md bg-gradient-to-r from-blue-400/50 via-cyan-400/50 to-blue-400/50 blur-sm opacity-50 animate-logo-border-glow -z-10" />
          </span>
          
          {/* Academy - with floating animation and glow */}
          <span 
            className={`text-white font-bold text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl drop-shadow-lg tracking-tight relative group-hover:scale-105 transition-transform duration-300 ${
              !isScrollingDown ? 'animate-logo-float animate-logo-text-glow' : ''
            }`}
            style={{
              animationDelay: hasScrolled && !isScrollingDown && lastScrollY > 50 ? '0.8s' : '0s'
            }}
          >
            {/* Subtle glow effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-white/30 via-blue-200/30 to-white/30 blur-md opacity-50 animate-logo-text-glow -z-10" />
            <span className="relative z-10">Academy</span>
          </span>
        </Link>

        {/* Image Slideshow Container */}
        <div className="relative w-full h-full min-h-screen">
          {/* Images with fade transition - only render current and next */}
          {heroImages.map((image, index) => {
            // Only render current image, previous image (for fade out), and next image (preloaded)
            const isCurrent = index === currentImageIndex;
            const isPrevious = index === (currentImageIndex - 1 + heroImages.length) % heroImages.length;
            const isNext = index === (currentImageIndex + 1) % heroImages.length;
            const shouldRender = isCurrent || isPrevious || (isNext && loadedImages.has(index));
            
            if (!shouldRender) return null;
            
            return (
              <div
                key={index}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                style={{ willChange: isCurrent || isPrevious ? 'opacity' : 'auto' }}
              >
                <img
                  src={image}
                  alt={`Hero slide ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                {/* Elegant gradient overlay - fades from top and bottom */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 10%, rgba(0, 0, 0, 0.5) 20%, rgba(0, 0, 0, 0.3) 35%, rgba(0, 0, 0, 0.2) 45%, rgba(0, 0, 0, 0.2) 55%, rgba(0, 0, 0, 0.3) 65%, rgba(0, 0, 0, 0.5) 80%, rgba(0, 0, 0, 0.7) 90%, rgba(0, 0, 0, 0.95) 100%)'
                  }}
                />
              </div>
            );
          })}

          {/* Navigation Dots */}
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap justify-center max-w-[90vw]">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  index === currentImageIndex
                    ? 'w-6 h-1.5 sm:w-8 sm:h-2 md:w-10 md:h-3 bg-white shadow-lg'
                    : 'w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Hero Title and Description - Left Half, Floating Above Images */}
          <div className="absolute left-3 right-3 sm:left-6 sm:right-auto sm:max-w-[85%] md:left-8 md:max-w-[75%] lg:left-12 lg:max-w-[65%] xl:left-16 xl:max-w-[55%] top-[50%] sm:top-[55%] -translate-y-1/2 z-30">
            <div 
              className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 py-3 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-10 xl:py-8 shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(25px) saturate(180%)',
                WebkitBackdropFilter: 'blur(25px) saturate(180%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)', // Force GPU acceleration
              }}
            >
              {/* Hero Title */}
              <h1 
                className="font-bold leading-tight mb-2 sm:mb-3 md:mb-4 lg:mb-5 drop-shadow-2xl text-left"
                style={{
                  fontSize: 'clamp(1.25rem, 4vw + 0.5rem, 3.5rem)',
                  background: 'linear-gradient(135deg, #d4af37 0%, #ffd700 20%, #ffed4e 40%, #ffd700 60%, #d4af37 80%, #b8860b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 3s ease infinite',
                  filter: 'drop-shadow(0 2px 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 4px 40px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 60px rgba(255, 215, 0, 0.4))',
                }}
              >
                {t('home.hero_title')}
              </h1>
              
              {/* Hero Description */}
              <p className="text-white text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-medium leading-relaxed sm:leading-relaxed drop-shadow-lg text-left mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                {t('home.hero_subtitle')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-3.5 lg:px-10 lg:py-4 bg-white text-blue-600 font-bold text-[10px] sm:text-xs md:text-sm lg:text-base rounded-lg sm:rounded-xl overflow-hidden transition-all duration-500 hover:scale-110 hover:shadow-2xl text-center button-primary cursor-not-allowed opacity-70"
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
                  
                  <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2 text-blue-600 group-hover:text-white transition-colors duration-300">
                    {t('home.get_started')}
                    <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
                  </span>
                </div>
                
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-3.5 lg:px-10 lg:py-4 bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white font-bold text-[10px] sm:text-xs md:text-sm lg:text-base rounded-lg sm:rounded-xl overflow-hidden transition-all duration-500 hover:bg-white/25 hover:border-white/70 hover:scale-110 hover:shadow-2xl text-center button-secondary cursor-not-allowed opacity-70"
                >
                  {/* Animated gradient border */}
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 via-white/40 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />
                  
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  
                  {/* Pulsing glow */}
                  <span className="absolute -inset-1 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500 animate-pulse -z-10" />
                  
                  {/* Inner glow */}
                  <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  
                  <span className="relative z-10 transition-all duration-300 group-hover:tracking-wide">{t('home.learn_more')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPORARILY HIDDEN - Featured Courses */}
      {/* <section className="py-12 sm:py-16 md:py-20 bg-white">
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
      </section> */}

      {/* TEMPORARILY HIDDEN - Benefits Section */}
      {/* <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
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
      </section> */}

      {/* TEMPORARILY HIDDEN - FAQ Section */}
      {/* <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
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
      </section> */}

      {/* TEMPORARILY HIDDEN - Testimonials */}
      {/* <section className="py-12 sm:py-16 md:py-20 bg-white">
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
      </section> */}

      {/* TEMPORARILY HIDDEN - CTA Section */}
      {/* <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-white">
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
      </section> */}
    </div>
  );
};

export default HomePage;