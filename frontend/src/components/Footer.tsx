import React from 'react';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  className?: string;
  openCookieSettingsRef?: React.MutableRefObject<(() => void) | null>;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  return (
    <footer className={`bg-gradient-to-r from-blue-900 via-sky-900 to-cyan-900 text-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 text-blue-200 text-sm">
          <p>
            © {new Date().getFullYear()} መሰል ወናኒ ዝተሓለወ እዩ።
          </p>
          <span className="hidden md:inline">•</span>
          <span className="inline-flex items-center">
            <span className="mr-1">ነዚ ወብሳይት ዝሰርሐ -&gt;</span>
            <a
              href="https://www.meronvault.com"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block font-extrabold tracking-wider bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow transition-all duration-500 transform hover:scale-125 hover:-rotate-6 hover:skew-x-6 hover:skew-y-1 hover:brightness-125 animate-neon-pulse spin-on-hover"
            >
              MERONI
              <span className="absolute inset-0 -z-10 pointer-events-none blur-md opacity-80 bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-400 rounded animate-gradient-shift"></span>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;