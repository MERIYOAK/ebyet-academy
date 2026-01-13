import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AvatarMenu from './AvatarMenu';
import { useNavbarAutoHide } from '../../hooks/useNavbarAutoHide';


const AdminNavbar: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { isVisible } = useNavbarAutoHide(100);
  const location = useLocation();
  const { isAuthenticated } = useAdminAuth();

  // Close mobile menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const navigation = useMemo(() => ([
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Courses', href: '/admin/courses' },
    { name: 'Bundles', href: '/admin/bundles' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Reviews', href: '/admin/reviews' },
  ]), []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between h-12 sm:h-14">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link to="/admin/dashboard" className="flex items-center space-x-3 transition-transform duration-200 hover:scale-105">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white relative">
                <span className="sm:hidden animate-text-glow bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg filter">
                  {t('brand.name')}
                </span>
                <span className="hidden sm:block animate-text-glow bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg filter">
                  {t('brand.name')}
                </span>
                {/* Mesmerizing light effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-blue-500/20 to-purple-500/20 blur-sm animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-l from-blue-300/40 via-cyan-300/30 to-purple-300/30 blur-md animate-pulse" style={{animationDelay: '1s'}}></div>
              </span>
            </Link>
            <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">Admin</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 ${
                  isActive(item.href)
                    ? 'text-white border-b-2 border-cyan-400'
                    : 'text-gray-300 hover:text-cyan-400'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <AvatarMenu variant="admin" />
            ) : (
              <Link
                to="/admin/login"
                className="text-white/90 hover:text-white transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-1"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button - Enhanced for touch */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-white hover:text-white/90 transition-all duration-300 ease-in-out transform hover:scale-105 rounded-lg hover:bg-white/10"
              aria-label="Toggle admin mobile menu"
            >
              {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Enhanced for Small Screens */}
      {isOpen && (
        <div 
          className="md:hidden transition-all duration-300 ease-in-out"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(6, 182, 212, 0.3)',
            maxHeight: 'calc(100vh - 4rem)',
            overflowY: 'auto'
          }}
        >
          <div className="px-3 sm:px-4 pt-3 pb-4 space-y-1">
            {/* Navigation Links */}
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-4 py-3 text-sm sm:text-base font-medium transition-all duration-300 ease-in-out transform hover:scale-105 rounded-lg ${
                  isActive(item.href)
                    ? 'text-white bg-cyan-500/20 border-l-4 border-cyan-400'
                    : 'text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Divider */}
            <div className="border-t border-gray-700/50 my-3"></div>
            
                         {/* Auth Section */}
             {isAuthenticated ? (
               <div className="px-4 py-2">
                 <div className="text-xs text-cyan-300 mb-3 font-medium">ADMIN ACCOUNT</div>
                 <div className="space-y-2">
                   <Link
                     to="/admin/upload"
                     className="flex items-center px-4 py-3 text-sm sm:text-base font-medium text-gray-300 hover:text-cyan-400 transition-all duration-300 ease-in-out rounded-lg hover:bg-gray-800/50"
                     onClick={() => setIsOpen(false)}
                   >
                     <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                     </svg>
                     Upload Course
                   </Link>
                   <div className="border-t border-gray-700/50 my-2"></div>
                   <button
                     onClick={() => {
                       localStorage.removeItem('adminToken');
                       window.location.href = '/admin/login';
                       setIsOpen(false);
                     }}
                     className="w-full text-left flex items-center px-4 py-3 text-sm sm:text-base font-medium text-gray-300 hover:text-cyan-400 transition-all duration-300 ease-in-out rounded-lg hover:bg-gray-800/50"
                   >
                     <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                     </svg>
                     Logout
                   </button>
                 </div>
               </div>
             ) : (
              <div className="space-y-3">
                <div className="text-xs text-cyan-300 px-4 font-medium">ADMIN ACCESS</div>
                <Link
                  to="/admin/login"
                  className="block px-4 py-3 text-sm sm:text-base font-medium text-white hover:text-cyan-400 transition-all duration-300 ease-in-out rounded-lg hover:bg-gray-800/50"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar; 