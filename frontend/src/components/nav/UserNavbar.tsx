import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl, config } from '../../config/environment';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, Youtube, Facebook, Instagram, Globe, ChevronDown } from 'lucide-react';
import AvatarMenu from './AvatarMenu';
import { getCurrentLanguage, changeLanguage } from '../../i18n';


const UserNavbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

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
        className={`fixed top-10 right-12 sm:top-12 sm:right-16 z-[101] flex items-center gap-3 transition-all duration-500 ease-in-out ${
          isScrollingDown ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Language Toggler */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLangMenuOpen(!isLangMenuOpen);
            }}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-semibold text-white hover:text-blue-100 hover:bg-white/10 backdrop-blur-sm rounded-full shadow-lg transition-all duration-300 border border-white/30"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{(i18n.language || getCurrentLanguage()) === 'en' ? 'EN' : 'TG'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Language Dropdown */}
          {isLangMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[102]"
                onClick={() => setIsLangMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-32 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl ring-1 ring-white/20 z-[103] overflow-hidden">
                <button
                  onClick={() => {
                    changeLanguage('tg');
                    setIsLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors duration-200 ${
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
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors duration-200 ${
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
          className="group p-2.5 sm:p-3 text-white hover:text-blue-100 transition-all duration-500 ease-in-out bg-white/10 backdrop-blur-sm rounded-full shadow-lg hover:shadow-2xl hover:scale-110 hover:rotate-90 border-2 border-white/50 hover:border-white hover:bg-white/20"
          aria-label="Toggle menu"
          style={{
            width: '44px',
            height: '44px',
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
              <X className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500 group-hover:rotate-180" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500 group-hover:rotate-90" strokeWidth={1.5} />
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
        <div className="h-full w-full flex flex-col lg:flex-row">
          {/* Left Side - Main Navigation with Glassy Background */}
          <div 
            className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-12 sm:py-16 lg:py-0 border-t lg:border-t-0 lg:border-r border-blue-200/30 relative"
            style={{
              background: 'rgba(219, 234, 254, 0.3)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              boxShadow: 'inset 0 1px 0 0 rgba(147, 197, 253, 0.4)',
            }}
          >
            <nav className="space-y-4 sm:space-y-6 lg:space-y-8">
              {mainNavigation.map((item, index) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={`group relative block text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight transition-all duration-500 ease-out hover:translate-x-2 hover:scale-[1.02] hover:tracking-wide ${
                    isActive(item.href)
                      ? 'text-blue-700'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease-out ${index * 0.1}s, transform 0.5s ease-out ${index * 0.1}s`,
                  }}
                >
                  {/* Hover underline effect */}
                  <span className="relative inline-block">
                    {item.name}
                    <span 
                      className="absolute bottom-0 left-0 w-0 h-[3px] bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out group-hover:w-full"
                    />
                  </span>
                  
                  {/* Subtle glow effect on hover */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-xl bg-blue-400 transition-opacity duration-500" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Side - Secondary Navigation & Auth with Background Image */}
          <div 
            className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-12 sm:py-16 lg:py-0 relative overflow-hidden"
            style={{
              backgroundImage: `url('/LOGO.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Dimming Overlay */}
            <div 
              className="absolute inset-0 bg-black/40 z-0"
              style={{
                opacity: isMenuOpen ? 1 : 0,
                transition: 'opacity 0.5s ease-out',
              }}
            />
            
            {/* Content with relative positioning to appear above overlay */}
            <div className="space-y-6 sm:space-y-8 relative z-10">
              {/* Login/Register Section - At the Top */}
              {!isAuthenticated && (
                <div 
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-6 sm:pb-8 border-b border-white/20"
                  style={{
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                    transition: `opacity 0.6s ease-out 0s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0s`,
                  }}
                >
                  <Link
                    to="/login"
                    onClick={handleLinkClick}
                    className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 rounded-lg text-center sm:text-left"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                    <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.login')}</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={handleLinkClick}
                    className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 rounded-lg text-center sm:text-left"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                    <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('navbar.register')}</span>
                  </Link>
                </div>
              )}

              {/* Secondary Links */}
              <nav className="space-y-4 sm:space-y-5 lg:space-y-6">
                {secondaryNavigation.map((item, index) => {
                  const baseDelay = isAuthenticated ? 0.1 : 0.3; // Adjust based on whether login/register is shown
                  return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={handleLinkClick}
                    className="group relative block text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg"
                    style={{
                      animationDelay: `${baseDelay + (index * 0.1)}s`,
                      opacity: isMenuOpen ? 1 : 0,
                      transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                      transition: `opacity 0.6s ease-out ${baseDelay + (index * 0.1)}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${baseDelay + (index * 0.1)}s`,
                    }}
                  >
                    {/* Elegant hover background with gradient */}
                    <span 
                      className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm"
                    />
                    {/* Subtle border on hover */}
                    <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Link Text with letter spacing */}
                    <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{item.name}</span>
                  </Link>
                  );
                })}
                
                {/* Verify Certificate Link */}
                <Link
                  to="/verify"
                  onClick={handleLinkClick}
                  className="group relative flex items-center space-x-3 text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 hover:text-white transition-all duration-500 py-3 px-5 -mx-5 rounded-lg"
                  style={{
                    animationDelay: `${(mainNavigation.length + secondaryNavigation.length) * 0.1}s`,
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0) translateX(0)' : 'translateY(20px) translateX(-10px)',
                    transition: `opacity 0.6s ease-out ${(mainNavigation.length + secondaryNavigation.length) * 0.1}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${(mainNavigation.length + secondaryNavigation.length) * 0.1}s`,
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out blur-sm" />
                  <span className="absolute inset-0 border border-white/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="relative z-10 tracking-wide group-hover:tracking-wider transition-all duration-300">{t('footer.verify_certificate')}</span>
                </Link>
              </nav>

              {/* Social Media Links */}
              <div 
                className="flex items-center space-x-5 sm:space-x-6"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transition: `opacity 0.5s ease-out ${(mainNavigation.length + secondaryNavigation.length + 1) * 0.1}s`,
                }}
              >
                <a
                  href={`https://youtube.com/@${config.SOCIAL_YOUTUBE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative text-white/70 hover:text-white transition-all duration-300 hover:scale-125"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:rotate-12" />
                  <span className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                </a>
                <a
                  href={`https://facebook.com/${config.SOCIAL_FACEBOOK}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative text-white/70 hover:text-white transition-all duration-300 hover:scale-125"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:rotate-12" />
                  <span className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                </a>
                <a
                  href={`https://instagram.com/${config.SOCIAL_INSTAGRAM}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative text-white/70 hover:text-white transition-all duration-300 hover:scale-125"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:rotate-12" />
                  <span className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                </a>
              </div>

              {/* Divider */}
              <div 
                className="border-t border-white/20 my-8 sm:my-10"
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
