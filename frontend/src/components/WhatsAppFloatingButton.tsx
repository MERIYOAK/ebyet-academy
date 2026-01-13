import React, { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { config } from '../config/environment';

const WhatsAppFloatingButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Format WhatsApp number (remove all non-digits)
  const whatsappNumber = config.SUPPORT_WHATSAPP.replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  // Entrance animation with delay
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        fixed z-50 
        bottom-4 left-4 
        sm:bottom-6 sm:left-6
        w-14 h-14 
        sm:w-16 sm:h-16 
        bg-[#25D366] 
        hover:bg-[#20BA5A] 
        active:bg-[#1DA851]
        rounded-full 
        shadow-lg 
        hover:shadow-2xl
        flex items-center justify-center 
        transition-all duration-500 ease-out
        transform
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}
        ${isHovered ? 'scale-110 shadow-[#25D366]/50' : 'scale-100'}
        active:scale-95
        group
        fab-float
        touch-manipulation
        select-none
      `}
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Icon with smooth rotation on hover */}
      <FaWhatsapp 
        className={`
          w-7 h-7 
          sm:w-8 sm:h-8
          text-white 
          transition-all duration-300 ease-out
          ${isHovered ? 'rotate-12 scale-110' : 'rotate-0 scale-100'}
        `} 
      />
      
      {/* Ripple effect - first layer */}
      <span 
        className={`
          absolute inset-0 
          rounded-full 
          bg-[#25D366] 
          opacity-0
          ${isHovered ? 'animate-ping' : ''}
        `}
        style={{ animationDuration: '2s' }}
      ></span>
      
      {/* Ripple effect - second layer with delay */}
      <span 
        className={`
          absolute inset-0 
          rounded-full 
          bg-[#25D366] 
          opacity-0
          ${isHovered ? 'animate-ping' : ''}
        `}
        style={{ animationDelay: '0.5s', animationDuration: '2s' }}
      ></span>
      
      {/* Subtle glow effect */}
      <span 
        className={`
          absolute inset-0 
          rounded-full 
          bg-[#25D366] 
          blur-xl
          -z-10
          transition-opacity duration-300
          ${isHovered ? 'opacity-40' : 'opacity-20'}
        `}
      ></span>
      
    </a>
  );
};

export default WhatsAppFloatingButton;

