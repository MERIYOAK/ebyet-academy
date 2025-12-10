import React, { useState, useRef, useEffect } from 'react';
import { contactConfig, fabConfig } from '../config/contactConfig';
import { Phone } from 'lucide-react';
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';

const FloatingContactButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Add entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), fabConfig.entranceDelay);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleContactClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsExpanded(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderIcon = (iconComponent: string) => {
    switch (iconComponent) {
      case 'phone':
        return <Phone className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'whatsapp':
        return <FaWhatsapp className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'telegram':
        return <FaTelegramPlane className="w-5 h-5 sm:w-6 sm:h-6" />;
      default:
        return <span className="text-xs sm:text-sm">{iconComponent}</span>;
    }
  };

  return (
    <>
      {/* Wave animation container */}
      <div className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 z-50">
        {/* Wave effect */}
        <div className={`absolute inset-0 rounded-full ${isExpanded ? 'opacity-0' : 'opacity-30'}`}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 fab-wave"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 fab-ripple" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-blue-500 fab-ripple" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Main FAB */}
        <div
          ref={buttonRef}
          className={`
            relative w-12 h-12 rounded-full 
            bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
            shadow-lg hover:shadow-2xl
            transform transition-all duration-300 ease-out
            cursor-pointer select-none
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            ${isExpanded ? 'scale-110' : 'hover:scale-110 fab-float'}
            border-2 border-white/20
            backdrop-blur-sm
          `}
          onClick={handleToggle}
          onKeyDown={(e) => handleKeyDown(e, handleToggle)}
          tabIndex={0}
          role="button"
          aria-label="Contact us"
          aria-expanded={isExpanded}
        >
          {/* 3D effect overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
                         {isExpanded ? (
               <span className="text-xl">✕</span>
             ) : (
               <Phone className="w-6 h-6" />
             )}
          </div>
        </div>

        {/* Contact options */}
        <div className={`
          absolute bottom-0 left-0 
          transition-all duration-300 ease-out
          ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}>
                     {contactConfig.map((option, index) => (
            <div
              key={option.id}
                             className={`
                 absolute left-0 mb-4
                 transform transition-all duration-300 ease-out
                 ${isExpanded 
                   ? `opacity-100 translate-y-0 delay-${index * 100}` 
                   : 'opacity-0 translate-y-2'
                 }
               `}
                             style={{
                 bottom: `${(index + 1) * 3.5}rem`,
                 transitionDelay: isExpanded ? `${index * fabConfig.optionDelay}ms` : '0ms'
               }}
            >
              <button
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full
                  ${option.color} ${option.hoverColor}
                  shadow-lg hover:shadow-xl
                  transform transition-all duration-200
                  hover:scale-110 active:scale-95
                  border-2 border-white/20
                  flex items-center justify-center
                  text-white text-base sm:text-lg
                  focus:outline-none focus:ring-4 focus:ring-blue-300/50
                `}
                onClick={() => handleContactClick(option.url)}
                onKeyDown={(e) => handleKeyDown(e, () => handleContactClick(option.url))}
                tabIndex={isExpanded ? 0 : -1}
                role="button"
                aria-label={option.label}
              >
                                 {renderIcon(option.iconComponent || option.icon)}
              </button>
              
              {/* Tooltip for larger screens */}
              <div className="absolute left-14 top-1/2 transform -translate-y-1/2 hidden sm:block">
                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {option.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

export default FloatingContactButton;
