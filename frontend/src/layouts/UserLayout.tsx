import React, { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from '../components/nav/UserNavbar';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import WhatsAppFloatingButton from '../components/WhatsAppFloatingButton';
import CookieConsent from '../components/CookieConsent';
import DarkModeToggle from '../components/DarkModeToggle';

const UserLayout: React.FC = () => {
  const openCookieSettingsRef = useRef<(() => void) | null>(null);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#28283D]">
      <div className="flex justify-between items-center p-4">
        <UserNavbar />
        <DarkModeToggle />
      </div>
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer className="relative z-30" openCookieSettingsRef={openCookieSettingsRef} />
      <CookieConsent onOpenSettingsRef={openCookieSettingsRef} />
      <ScrollToTop />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default UserLayout; 