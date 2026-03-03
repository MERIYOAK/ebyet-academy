/**
 * App component with providers and socket notifications
 * This ensures useSocketNotifications is called within ToastProvider
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './ui/Toast';
import deploymentNotificationService from '../services/deploymentNotificationService';
import { ThemeProvider } from '../contexts/ThemeContext';
import { queryClient, initializePersistentCache, saveCacheData } from '../lib/queryClient';
import '../utils/cacheMigration';
import '../utils/cacheTester';
import '../utils/userCacheVerifier';
import '../utils/cachePersistence';
import '../utils/cacheInspector';
import '../utils/cacheClearer';
import '../i18n';
import ScrollManager from './ScrollManager';
import SessionMonitorWrapper from './SessionMonitorWrapper';
import MetaTagsUpdater from './MetaTagsUpdater';
import RateLimitOverlay from './RateLimitOverlay';
import { useRateLimit } from '../hooks/useRateLimit';
import PaymentFailureHandler from './PaymentFailureHandler';
// Import test utilities for development
import '../utils/testDeploymentNotification';

// Import layouts and pages
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ResendVerificationPage from '../pages/ResendVerificationPage';
import ProfilePage from '../pages/ProfilePage';
import CourseDetailPage from '../pages/CourseDetailPage';
import DashboardPage from '../pages/DashboardPage';
import AdminUploadPage from '../pages/AdminUploadPage';
import AdminCoursesPage from '../pages/AdminCoursesPage';
import AdminCourseViewPage from '../pages/AdminCourseViewPage';
import AdminCourseEditPage from '../pages/AdminCourseEditPage';
import AdminCourseVideosPage from '../pages/AdminCourseVideosPage';
import AdminVideoUploadPage from '../pages/AdminVideoUploadPage';
import AdminVideoPlayerPage from '../pages/AdminVideoPlayerPage';
import AdminLoginPage from '../pages/AdminLoginPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminBundlesPage from '../pages/AdminBundlesPage';
import AdminBundleUploadPage from '../pages/AdminBundleUploadPage';
import AdminBundleViewPage from '../pages/AdminBundleViewPage';
import AdminBundleEditPage from '../pages/AdminBundleEditPage';
import AdminAnnouncementsPage from '../pages/AdminAnnouncementsPage';
import AdminReviewsPage from '../pages/AdminReviewsPage';
import CheckoutSuccessPage from '../pages/CheckoutSuccessPage';
import CheckoutCancelPage from '../pages/CheckoutCancelPage';
import PaymentFailurePage from '../pages/PaymentFailurePage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import CoursesPage from '../pages/CoursesPage';
import BundlesPage from '../pages/BundlesPage';
import BundleDetailPage from '../pages/BundleDetailPage';
import HelpCenterPage from '../pages/HelpCenterPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import GoogleCallbackPage from '../pages/GoogleCallbackPage';
import CompleteGoogleRegistrationPage from '../pages/CompleteGoogleRegistrationPage';

function AppWithProviders() {
  const { rateLimit, dismissRateLimit } = useRateLimit();

  // Initialize deployment notification service
  useEffect(() => {
    initializePersistentCache();
    
    // Start deployment notification service
    deploymentNotificationService.startDeploymentCheck();
    
    // Cleanup function
    return () => {
      deploymentNotificationService.stopDeploymentCheck();
    };
    
    // Start enhanced cache persistence monitoring
    const stopCacheMonitoring = (window as any).CachePersistence?.startCacheMonitoring();
    
    // Save cache data on page unload
    const handleBeforeUnload = () => {
      saveCacheData();
      (window as any).CachePersistence?.forceSaveAllCache();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (stopCacheMonitoring) stopCacheMonitoring();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveCacheData(); // Final save on cleanup
      (window as any).CachePersistence?.forceSaveAllCache();
    };
  }, []);

  return (
    <Router>
      <MetaTagsUpdater />
      <SessionMonitorWrapper>
        <ScrollManager>
          <PaymentFailureHandler />
          <Routes>
            <Route element={<UserLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/resend-verification" element={<ResendVerificationPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/course/:id" element={<CourseDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/bundles" element={<BundlesPage />} />
              <Route path="/bundles/:id" element={<BundleDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
              <Route path="/checkout/failure" element={<PaymentFailurePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help-center" element={<HelpCenterPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            </Route>

            {/* Google OAuth Callback Route - Outside UserLayout to avoid navbar */}
            <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />
            <Route path="/complete-google-registration" element={<CompleteGoogleRegistrationPage />} />

            <Route path="/admin" element={
              <AdminAuthProvider>
                <AdminLayout />
              </AdminAuthProvider>
            }>
              <Route path="login" element={<AdminLoginPage />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="upload" element={<AdminUploadPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="courses/:courseId" element={<AdminCourseViewPage />} />
              <Route path="courses/:courseId/edit" element={<AdminCourseEditPage />} />
              <Route path="courses/:courseId/videos" element={<AdminCourseVideosPage />} />
              <Route path="courses/:courseId/videos/:videoId" element={<AdminVideoPlayerPage />} />
              <Route path="courses/:courseId/videos/upload" element={<AdminVideoUploadPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="bundles" element={<AdminBundlesPage />} />
              <Route path="bundles/upload" element={<AdminBundleUploadPage />} />
              <Route path="bundles/:bundleId" element={<AdminBundleViewPage />} />
              <Route path="bundles/:bundleId/edit" element={<AdminBundleEditPage />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
            </Route>
          </Routes>
        </ScrollManager>
      </SessionMonitorWrapper>
      <RateLimitOverlay 
        isVisible={rateLimit.isVisible}
        onDismiss={dismissRateLimit}
        resetTime={rateLimit.resetTime}
        retryAfter={rateLimit.retryAfter}
      />
    </Router>
  );
}

// Main App component that wraps everything with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AppWithProviders />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
