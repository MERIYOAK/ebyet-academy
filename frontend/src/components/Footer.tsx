import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok, FaLinkedin } from 'react-icons/fa';
import { Mail, Phone, MapPin, Shield, FileText, HelpCircle } from 'lucide-react';

interface FooterProps {
  className?: string;
  openCookieSettingsRef?: React.MutableRefObject<(() => void) | null>;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`bg-gray-900 border-t border-gray-800 ${className}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t('brand.name')}
              </h3>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.description', 'Master the art of investing and trading with our comprehensive courses designed by industry experts.')}
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <FaFacebook className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <FaInstagram className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <FaTwitter className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="TikTok"
              >
                <FaTiktok className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors duration-300" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-cyan-500/20 border border-gray-700 hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors duration-300" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              {t('footer.quick_links', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.home', 'Home')}</span>
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.courses', 'Courses')}</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.about', 'About')}</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.contact', 'Contact')}</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <span>{t('navbar.dashboard', 'Dashboard')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              {t('footer.support', 'Support & Legal')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help-center" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('footer.help_center', 'Help Center')}</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{t('footer.privacy_policy', 'Privacy Policy')}</span>
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{t('footer.terms_of_service', 'Terms of Service')}</span>
                </Link>
              </li>
              <li>
                <Link to="/verify-certificate" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{t('footer.verify_certificate', 'Verify Certificate')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              {t('footer.contact_us', 'Contact Us')}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <a href="mailto:support@ibyet.com" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm">
                  support@ibyet.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <a href="tel:+1234567890" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm">
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm">
                  {t('footer.address', '123 Investment Street, Financial District, NY 10001')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm text-center sm:text-left">
              <p>
                © {currentYear} {t('brand.name')}. {t('footer.copyright')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="hidden sm:inline">{t('footer.developed_by', 'Developed by')}</span>
              <a
                href="https://www.meronvault.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
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