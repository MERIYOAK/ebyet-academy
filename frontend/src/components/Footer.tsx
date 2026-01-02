import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFacebook, FaYoutube, FaTiktok, FaLinkedin } from 'react-icons/fa';
import { Mail, Phone, MapPin, Shield, FileText, HelpCircle } from 'lucide-react';
import { config } from '../config/environment';

interface FooterProps {
  className?: string;
  openCookieSettingsRef?: React.MutableRefObject<(() => void) | null>;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  const currentYear = new Date().getFullYear();
  
  // Get contact info from environment config
  const supportEmail = config.SUPPORT_EMAIL;
  const supportPhone = config.SUPPORT_PHONE;
  const supportAddress = config.SUPPORT_ADDRESS;
  
  // Format phone number for tel: link (remove spaces, parentheses, and dashes)
  const phoneLink = supportPhone.replace(/[\s()\-]/g, '');
  
  return (
    <footer className={`bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 ${className}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('brand.name')}
              </h3>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {t('footer.description', 'Master the art of investing and trading with our comprehensive courses designed by industry experts.')}
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 border border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="X (Twitter)"
              >
                <svg 
                  className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300" 
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
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 border border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="YouTube"
              >
                <FaYoutube className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 border border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="TikTok"
              >
                <FaTiktok className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 border border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <FaFacebook className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 border border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-lg mb-4">
              {t('footer.quick_links', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.home', 'Home')}</span>
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.courses', 'Courses')}</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.about', 'About')}</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.contact', 'Contact')}</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.dashboard', 'Dashboard')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-lg mb-4">
              {t('footer.support', 'Support & Legal')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help-center" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('footer.help_center', 'Help Center')}</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{t('footer.privacy_policy', 'Privacy Policy')}</span>
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{t('footer.terms_of_service', 'Terms of Service')}</span>
                </Link>
              </li>
              <li>
                <Link to="/verify-certificate" className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{t('footer.verify_certificate', 'Verify Certificate')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-lg mb-4">
              {t('footer.contact_us', 'Contact Us')}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <a href={`mailto:${supportEmail}`} className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm">
                  {supportEmail}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <a href={`tel:${phoneLink}`} className="text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-300 text-sm">
                  {supportPhone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  {supportAddress}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              <p>
                © {currentYear} {t('brand.name')}. {t('footer.copyright')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <span>{t('footer.developed_by', 'This website is made by')}</span>
              <a
                href="https://www.meronvault.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors duration-300"
              >
                MERONI
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;