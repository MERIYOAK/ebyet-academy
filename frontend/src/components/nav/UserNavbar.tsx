import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl } from '../../config/environment';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, Youtube, Facebook, Instagram, Globe, ChevronDown } from 'lucide-react';
import AvatarMenu from './AvatarMenu';
import { getCurrentLanguage, changeLanguage } from '../../i18n';

// Import hero images for navbar background
import navImage1 from '../../assets/images/pexels-davidmcbee-730547.jpg';
import navImage2 from '../../assets/images/pexels-dvaughnbell-2068664.jpg';
import navImage3 from '../../assets/images/pexels-karola-g-5980876.jpg';
import navImage4 from '../../assets/images/pexels-kindelmedia-7054384.jpg';
import navImage5 from '../../assets/images/pexels-michael-steinberg-95604-318820.jpg';
import navImage6 from '../../assets/images/pexels-n-voitkevich-6120218.jpg';
import navImage7 from '../../assets/images/pexels-pixabay-259091.jpg';


const UserNavbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentNavImageIndex, setCurrentNavImageIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  // Navbar background images
  const navImages = [navImage1, navImage2, navImage3, navImage4, navImage5, navImage6, navImage7];

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

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsLangMenuOpen(false);
  }, [location.pathname]);

  // Close language menu when navbar menu closes
  useEffect(() => {
    if (!isMenuOpen) {
      setIsLangMenuOpen(false);
    }
  }, [isMenuOpen]);

  // Rotate navbar background images when menu is open
  useEffect(() => {
    if (!isMenuOpen) return;
    
    const interval = setInterval(() => {
      setCurrentNavImageIndex((prev) => (prev + 1) % navImages.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [isMenuOpen, navImages.length]);

  // Main navigation links (displayed on left side of overlay)
  const mainNavigation = useMemo(() => ([
    { name: t('navbar.home'), href: '/' },
    { name: t('navbar.courses'), href: '/courses' },
    { name: t('navbar.about'), href: '/about' },
    { name: t('navbar.contact'), href: '/contact' },
  ]), [t]);

  // Secondary navigation links (displayed on right side of overlay)
  const secondaryNavigation = useMemo(() => ([
    { name: t('footer.privacy_policy'), href: '/privacy-policy' },
    { name: t('footer.terms_of_service'), href: '/terms-of-service' },
    { name: t('footer.help_center'), href: '/help-center' },
  ]), [t]);

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  // Fetch profile image when user is authenticated
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!isAuthenticated) {
        setProfileImageUrl(null);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const userResponse = await fetch(buildApiUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (userResponse.ok) {
          const userResult = await userResponse.json();
          
          if (userResult.data.profilePhotoKey) {
            const photoResponse = await fetch(buildApiUrl('/api/auth/users/me/photo'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

            if (photoResponse.ok) {
              const photoResult = await photoResponse.json();
              setProfileImageUrl(photoResult.data.photoUrl);
            } else {
              setProfileImageUrl(null);
            }
          } else {
            setProfileImageUrl(null);
          }
        }
      } catch (error) {
        setProfileImageUrl(null);
      }
    };

    fetchProfileImage();
  }, [isAuthenticated]);

  return (
    <>
      {/* Language Toggler and Menu Button - Floating above hero */}
      <div 
        className={`fixed top-4 right-4 sm:top-10 sm:right-12 md:top-12 md:right-16 z-[101] flex items-center gap-2 sm:gap-3 transition-all duration-500 ease-in-out ${
          isScrollingDown 
            ? 'opacity-0 -translate-y-4 pointer-events-none' 
            : 'opacity-100 translate-y-0'
      }`}
      style={{
          transform: isScrollingDown 
            ? 'translateY(-20px)' 
            : 'translateY(0)',
          animation: hasScrolled && !isScrollingDown && lastScrollY > 50 
            ? 'fadeInFromTop 0.5s ease-out' 
            : 'none'
        }}
      >
        {/* Language Toggler */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLangMenuOpen(!isLangMenuOpen);
            }}
            className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:text-blue-100 hover:bg-white/10 backdrop-blur-sm rounded-full shadow-lg transition-all duration-300 border border-white/30"
            aria-label="Toggle language"
          >
            <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{(i18n.language || getCurrentLanguage()) === 'en' ? 'EN' : 'TG'}</span>
            <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Language Dropdown */}
          {isLangMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[102]"
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-28 sm:w-32 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl ring-1 ring-white/20 z-[103] overflow-hidden">
                <button
                  onClick={() => {
                    changeLanguage('tg');
                    setIsLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-white/20 transition-colors duration-200 ${
                    (i18n.language || getCurrentLanguage()) === 'tg' ? 'bg-blue-50/50 text-blue-700 font-semibold' : 'text-gray-700 font-semibold'
                  }`}
                >
                  {t('language.tigrinya')}
                </button>
                <button
                  onClick={() => {
                    changeLanguage('en');
                    setIsLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-white/20 transition-colors duration-200 ${
                    (i18n.language || getCurrentLanguage()) === 'en' ? 'bg-blue-50/50 text-blue-700 font-semibold' : 'text-gray-700 font-semibold'
                  }`}
                >
                  {t('language.english')}
                </button>
              </div>
              </>
            )}
          </div>

        {/* Hamburger Menu Button */}
            <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group p-2 sm:p-2.5 md:p-3 text-white hover:text-blue-100 transition-all duration-500 ease-in-out bg-white/10 backdrop-blur-sm rounded-full shadow-lg hover:shadow-2xl hover:scale-110 hover:rotate-90 border border-white/50 sm:border-2 hover:border-white hover:bg-white/20"
          aria-label="Toggle menu"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Glowing ring effect on hover */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-500 animate-pulse" />
          
          {/* Icon with rotation animation */}
          <span className="relative z-10 transition-transform duration-500 group-hover:scale-110">
            {isMenuOpen ? (
              <X className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform duration-500 group-hover:rotate-180" strokeWidth={1.5} />
            ) : (
              <Menu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform duration-500 group-hover:rotate-90" strokeWidth={1.5} />
            )}
          </span>
        </button>
      </div>

      {/* Full-Screen Overlay Menu */}
      <div
        className={`fixed inset-0 z-[99] bg-white transition-opacity duration-500 ease-in-out ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          // Close menu when clicking on the overlay background
          if (e.target === e.currentTarget) {
            setIsMenuOpen(false);
          }
        }}
      >
        <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side - Main Navigation with Glassy Background */}
          <div 
            className="flex-1 flex flex-col justify-start lg:justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-6 sm:py-8 md:py-12 lg:py-0 border-t lg:border-t-0 lg:border-r border-gray-700/30 relative overflow-y-auto scrollbar-hide"
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
              minHeight: '50%',
              maxHeight: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <nav className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 pt-8 sm:pt-10 md:pt-12 lg:pt-16 xl:pt-20">
              {mainNavigation.map((item, index) => (
                <div
                key={item.name}
                  onClick={(e) => e.preventDefault()}
                  className={`group relative block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight transition-all duration-500 ease-out hover:translate-x-2 hover:scale-[1.02] hover:tracking-wide cursor-not-allowed opacity-70 ${
                  isActive(item.href)
                      ? 'text-white'
                      : 'text-white/80 hover:text-white'
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    opacity: isMenuOpen ? 0.7 : 0,
                    transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease-out ${index * 0.1}s, transform 0.5s ease-out ${index * 0.1}s`,
                  }}
                >
                  {/* Hover underline effect */}
                  <span className="relative inline-block">
                {item.name}
                    <span 
                      className="absolute bottom-0 left-0 w-0 h-[3px] bg-gradient-to-r from-white/80 to-white transition-all duration-500 ease-out group-hover:w-full"
                    />
                  </span>
                  
                  {/* Subtle glow effect on hover */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-xl bg-white transition-opacity duration-500" />
                </div>
              ))}
            </nav>
          </div>

          {/* Right Side - Secondary Navigation & Auth with Background Image */}
          <div 
            className="flex-1 flex flex-col justify-start lg:justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-6 sm:py-8 md:py-12 lg:py-0 relative overflow-y-auto scrollbar-hide"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              minHeight: '50%',
              maxHeight: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Rotating Background Images - only render current */}
            {isMenuOpen && (
              <div
                key={currentNavImageIndex}
                className="absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out"
                style={{
                  backgroundImage: `url(${navImages[currentNavImageIndex]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.15,
                  filter: 'blur(3px)',
                  willChange: 'opacity',
                }}
              />
            )}
            
            {/* Dark Dimming Overlay */}
            <div 
              className="absolute inset-0 bg-black/40 z-[1]"
              style={{
                opacity: isMenuOpen ? 1 : 0,
                transition: 'opacity 0.5s ease-out',
              }}
            />
            
            {/* Content with relative positioning to appear above overlay */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 relative z-10 pt-2 sm:pt-4 lg:pt-0 pb-4 sm:pb-6 lg:pb-0">
              {/* Login/Register Section - At the Top */}
              {!isAuthenticated && (
                <div 
                  className="flex flex-row gap-2 sm:gap-3 md:gap-4 pb-3 sm:pb-4 md:pb-6 border-b border-white/20"
                  style={{
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                    transition: `opacity 0.6s ease-out 0s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0s`,
                  }}
                >
                  <div
                    onClick={(e) => e.preventDefault()}
                    className="group relative flex-1 block text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white transition-all duration-500 py-2 px-2 sm:py-3 sm:px-5 rounded-lg text-center cursor-not-allowed overflow-hidden"
                  >
                    {/* Animated gradient background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out" />
                    {/* Shimmer effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    {/* Glowing border */}
                    <span className="absolute inset-0 border-2 border-white/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                    {/* Scale and glow effect */}
                    <span className="absolute -inset-1 bg-white/30 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300 group-hover:scale-105 inline-block">{t('navbar.login')}</span>
                  </div>
                  <div
                    onClick={(e) => e.preventDefault()}
                    className="group relative flex-1 block text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white transition-all duration-500 py-2 px-2 sm:py-3 sm:px-5 rounded-lg text-center cursor-not-allowed overflow-hidden"
                  >
                    {/* Animated gradient background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out" />
                    {/* Shimmer effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    {/* Glowing border */}
                    <span className="absolute inset-0 border-2 border-white/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                    {/* Scale and glow effect */}
                    <span className="absolute -inset-1 bg-white/30 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300 group-hover:scale-105 inline-block">{t('navbar.register')}</span>
                  </div>
                </div>
              )}

              {/* Secondary Links */}
              <nav className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
                {secondaryNavigation.map((item, index) => {
                  const baseDelay = isAuthenticated ? 0.1 : 0.3; // Adjust based on whether login/register is shown
                  return (
                  <div
                    key={item.name}
                    onClick={(e) => e.preventDefault()}
                    className="group relative block text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white transition-all duration-500 py-2 px-3 sm:py-3 sm:px-5 -mx-3 sm:-mx-5 rounded-lg cursor-not-allowed overflow-hidden"
                    style={{
                      animationDelay: `${baseDelay + (index * 0.1)}s`,
                      opacity: isMenuOpen ? 1 : 0,
                      transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                      transition: `opacity 0.6s ease-out ${baseDelay + (index * 0.1)}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${baseDelay + (index * 0.1)}s`,
                    }}
                  >
                    {/* Animated gradient background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out" />
                    {/* Shimmer effect */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    {/* Glowing border */}
                    <span className="absolute inset-0 border-2 border-white/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                    {/* Scale and glow effect */}
                    <span className="absolute -inset-1 bg-white/30 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                    {/* Link Text with letter spacing */}
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300 group-hover:scale-105 inline-block">{item.name}</span>
                  </div>
                  );
                })}
                
                {/* Verify Certificate Link */}
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative flex items-center space-x-2 sm:space-x-3 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white transition-all duration-500 py-2 px-3 sm:py-3 sm:px-5 -mx-3 sm:-mx-5 rounded-lg cursor-not-allowed overflow-hidden"
                  style={{
                    animationDelay: `${(mainNavigation.length + secondaryNavigation.length) * 0.1}s`,
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                    transition: `opacity 0.6s ease-out ${(mainNavigation.length + secondaryNavigation.length) * 0.1}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${(mainNavigation.length + secondaryNavigation.length) * 0.1}s`,
                  }}
                >
                  {/* Animated gradient background */}
                  <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out" />
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  {/* Glowing border */}
                  <span className="absolute inset-0 border-2 border-white/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                  {/* Scale and glow effect */}
                  <span className="absolute -inset-1 bg-white/30 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 relative z-10 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                  <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300 group-hover:scale-105">{t('footer.verify_certificate')}</span>
                </div>
              </nav>

              {/* Social Media Links - Hidden on mobile */}
              <div 
                className="hidden md:flex items-center space-x-3 sm:space-x-5 md:space-x-6"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transition: `opacity 0.5s ease-out ${(mainNavigation.length + secondaryNavigation.length + 1) * 0.1}s`,
                }}
              >
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative text-white transition-all duration-300 cursor-not-allowed p-1.5 sm:p-2 rounded-full"
                  aria-label="YouTube"
                >
                  <Youtube className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-all duration-300 group-hover:scale-150 group-hover:rotate-12 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" />
                  <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300 scale-150" />
                  <span className="absolute inset-0 border-2 border-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                </div>
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative text-white transition-all duration-300 cursor-not-allowed p-1.5 sm:p-2 rounded-full"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-all duration-300 group-hover:scale-150 group-hover:rotate-12 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" />
                  <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300 scale-150" />
                  <span className="absolute inset-0 border-2 border-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                </div>
                <div
                  onClick={(e) => e.preventDefault()}
                  className="group relative text-white transition-all duration-300 cursor-not-allowed p-1.5 sm:p-2 rounded-full"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-all duration-300 group-hover:scale-150 group-hover:rotate-12 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" />
                  <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300 scale-150" />
                  <span className="absolute inset-0 border-2 border-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                </div>
              </div>
            
              {/* Divider */}
              <div 
                className="border-t border-white/20 my-4 sm:my-6 md:my-8 lg:my-10"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transition: `opacity 0.5s ease-out ${(mainNavigation.length + secondaryNavigation.length + 2) * 0.1}s`,
                }}
              />

              {/* Authentication Section */}
              <div 
                className="space-y-4 sm:space-y-5"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                  transition: `opacity 0.6s ease-out ${(mainNavigation.length + secondaryNavigation.length + 2) * 0.1}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${(mainNavigation.length + secondaryNavigation.length + 2) * 0.1}s`,
                }}
              >
              {isAuthenticated ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <AvatarMenu variant="user" profileImageUrl={profileImageUrl} />
                    </div>
                                       <Link
                      to="/dashboard"
                      onClick={handleLinkClick}
                      className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                      <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.dashboard')}</span>
                   </Link>
                                       <Link
                      to="/profile"
                      onClick={handleLinkClick}
                      className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                      <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.profile')}</span>
                   </Link>
                                       <Link
                      to="/certificates"
                      onClick={handleLinkClick}
                      className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                      <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.my_certificates')}</span>
                   </Link>
                                       <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        handleLinkClick();
                        navigate('/login');
                      }}
                      className="group relative block text-left text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg mt-4 sm:mt-5"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                      <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.logout')}</span>
                   </button>
                  </>
                ) : null}
                 </div>
                </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserNavbar; 
