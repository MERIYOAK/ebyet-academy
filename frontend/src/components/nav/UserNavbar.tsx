import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl } from '../../config/environment';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, Globe, ChevronDown, Sun, Moon } from 'lucide-react';
import AvatarMenu from './AvatarMenu';
import { getCurrentLanguage, changeLanguage } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';


const UserNavbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');


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

  // Main navigation links
  const mainNavigation = useMemo(() => ([
    { name: t('navbar.home'), href: '/' },
    { name: t('navbar.courses'), href: '/courses' },
    { name: t('navbar.bundles'), href: '/bundles' },
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

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // Already on home page, just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navigate to home page first, then scroll to top
      navigate('/');
      // Use setTimeout to ensure navigation happens before scrolling
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
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
      {/* Navbar - Transparent with Hero Image Background */}
      <nav 
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300 bg-white/30 dark:bg-[rgba(40,40,61,0.3)] backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 xs:h-16 sm:h-16 md:h-20 min-h-[56px]">
            {/* Brand Name - Left */}
            <Link
              to="/"
              onClick={handleLogoClick}
              className="text-gray-900 dark:text-white font-bold text-base xs:text-lg sm:text-xl md:text-2xl hover:opacity-80 transition-opacity truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-none"
              title={t('brand.name')}
            >
              <span className="hidden xs:inline">{t('brand.name')}</span>
              <span className="xs:hidden">{t('brand.name')}</span>
            </Link>

            {/* Navigation Links - Center (hidden on mobile) */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
              {mainNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-gray-900/90 dark:text-white/90 hover:text-gray-900 dark:hover:text-white text-xs sm:text-sm md:text-base font-medium transition-colors whitespace-nowrap"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side - Buttons and Menu */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 dark:border-white/20 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all duration-300 hover:scale-110"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                  {theme === 'dark' ? (
                  <Moon className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-gray-900 dark:text-white" />
                ) : (
                  <Sun className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-gray-900 dark:text-white" />
                )}
              </button>

              {/* Language Toggler */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLangMenuOpen(!isLangMenuOpen);
                  }}
                  className="flex items-center space-x-0.5 xs:space-x-1 px-1.5 xs:px-2 sm:px-2.5 md:px-3 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-900 dark:text-white hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm rounded-full transition-all border border-gray-300/50 dark:border-white/20 min-w-[28px] xs:min-w-[32px] sm:min-w-[auto] justify-center"
                  aria-label="Toggle language"
                >
                  <Globe className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">{(i18n.language || getCurrentLanguage()) === 'en' ? 'EN' : 'ትግ'}</span>
                  <ChevronDown className={`w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 transition-transform duration-200 flex-shrink-0 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>
               
                {/* Language Dropdown */}
                {isLangMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[102]"
                      onClick={() => setIsLangMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-28 xs:w-32 sm:w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl ring-1 ring-white/20 z-[103] overflow-hidden">
                      <button
                        onClick={() => {
                          changeLanguage('tg');
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 text-xs xs:text-sm hover:bg-white/20 transition-colors duration-200 ${
                          (i18n.language || getCurrentLanguage()) === 'tg' ? 'bg-cyan-50/50 text-cyan-700 font-semibold' : 'text-gray-700 font-semibold'
                        }`}
                      >
                        {t('language.tigrinya')}
                      </button>
                      <button
                        onClick={() => {
                          changeLanguage('en');
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 text-xs xs:text-sm hover:bg-white/20 transition-colors duration-200 ${
                          (i18n.language || getCurrentLanguage()) === 'en' ? 'bg-cyan-50/50 text-cyan-700 font-semibold' : 'text-gray-700 font-semibold'
                        }`}
                      >
                        {t('language.english')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Auth Buttons - Desktop */}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-semibold text-cyan-400 border border-cyan-400 rounded-lg hover:bg-cyan-400/20 hover:border-cyan-300 hover:text-cyan-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/30 active:scale-95 transition-all duration-200 whitespace-nowrap"
                    style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
                  >
                    {t('navbar.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:block px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-semibold text-white rounded-lg hover:brightness-110 hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/40 active:scale-95 transition-all duration-200 whitespace-nowrap"
                    style={{ backgroundColor: '#00BFFF' }}
                  >
                    {t('navbar.register')}
                  </Link>
                </>
              )}

              {/* Avatar Menu - Desktop */}
              {isAuthenticated && (
                <div className="hidden sm:block">
                  <AvatarMenu variant="user" profileImageUrl={profileImageUrl} />
                </div>
              )}

              {/* Hamburger Menu Button - Mobile */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden p-1.5 xs:p-2 text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 xs:h-6 xs:w-6" />
                ) : (
                  <Menu className="h-5 w-5 xs:h-6 xs:w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>


      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[99] transition-opacity duration-500 ease-in-out sm:hidden ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'rgba(40, 40, 61, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsMenuOpen(false);
          }
        }}
      >
        <div className="h-full w-full flex flex-col px-4 xs:px-5 sm:px-6 py-6 xs:py-8 overflow-y-auto">
          {/* Mobile Navigation Links */}
          <nav className="space-y-4 xs:space-y-5 sm:space-y-6 pt-12 xs:pt-14 sm:pt-16">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleLinkClick}
                className={`block text-xl xs:text-2xl sm:text-3xl font-bold text-white/90 hover:text-white transition-colors ${
                  isActive(item.href) ? 'text-white' : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Mobile Auth Buttons */}
          {!isAuthenticated && (
            <div className="mt-6 xs:mt-8 space-y-3 xs:space-y-4">
              <Link
                to="/login"
                onClick={handleLinkClick}
                className="block w-full px-5 xs:px-6 py-2.5 xs:py-3 text-center text-sm xs:text-base font-semibold text-cyan-400 border border-cyan-400 rounded-lg hover:bg-cyan-400/20 hover:border-cyan-300 hover:text-cyan-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-400/30 active:scale-[0.98] transition-all duration-200"
                style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
              >
                {t('navbar.login')}
              </Link>
              <Link
                to="/register"
                onClick={handleLinkClick}
                className="block w-full px-5 xs:px-6 py-2.5 xs:py-3 text-center text-sm xs:text-base font-semibold text-white rounded-lg hover:brightness-110 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-400/40 active:scale-[0.98] transition-all duration-200"
                style={{ backgroundColor: '#00BFFF' }}
              >
                {t('navbar.register')}
              </Link>
            </div>
          )}

          {/* Mobile User Menu */}
          {isAuthenticated && (
            <div className="mt-6 xs:mt-8 space-y-3 xs:space-y-4">
              <div className="flex items-center gap-3 xs:gap-4 mb-4 xs:mb-6">
                <AvatarMenu variant="user" profileImageUrl={profileImageUrl} />
              </div>
              <Link
                to="/dashboard"
                onClick={handleLinkClick}
                className="block text-base xs:text-lg sm:text-xl font-semibold text-white/90 hover:text-white transition-colors py-2"
              >
                {t('navbar.dashboard')}
              </Link>
              <Link
                to="/profile"
                onClick={handleLinkClick}
                className="block text-base xs:text-lg sm:text-xl font-semibold text-white/90 hover:text-white transition-colors py-2"
              >
                {t('navbar.profile')}
              </Link>
              <Link
                to="/certificates"
                onClick={handleLinkClick}
                className="block text-base xs:text-lg sm:text-xl font-semibold text-white/90 hover:text-white transition-colors py-2"
              >
                {t('navbar.my_certificates')}
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  handleLinkClick();
                  navigate('/login');
                }}
                className="block text-left text-base xs:text-lg sm:text-xl font-semibold text-white/90 hover:text-white transition-colors py-2 mt-3 xs:mt-4"
              >
                {t('navbar.logout')}
              </button>
            </div>
          )}

          {/* Secondary Links */}
          <nav className="mt-auto pt-6 xs:pt-8 space-y-3 xs:space-y-4 border-t border-white/20">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleLinkClick}
                className="block text-sm xs:text-base text-white/70 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
            <Link
              to="/verify-certificate"
              onClick={handleLinkClick}
              className="flex items-center gap-2 text-sm xs:text-base text-white/70 hover:text-white transition-colors"
            >
              <Shield className="h-3.5 w-3.5 xs:h-4 xs:w-4 flex-shrink-0" />
              {t('footer.verify_certificate')}
            </Link>
          </nav>
        </div>
      </div>

    </>
  );
};

export default UserNavbar; 
