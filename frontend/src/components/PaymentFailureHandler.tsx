import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentStatusService from '../services/paymentStatusService';

const PaymentFailureHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentService = PaymentStatusService.getInstance();

  useEffect(() => {
    const checkForPaymentFailure = () => {
      console.log('🔍 PaymentFailureHandler - Checking for payment failure...');
      console.log('   - Current path:', location.pathname);
      console.log('   - Current search:', location.search);

      // First, check for failure indicators in URL
      const failureStatus = paymentService.detectFailureFromURL();
      if (failureStatus) {
        console.log('❌ Payment failure detected from URL');
        const courseId = failureStatus.courseId;
        if (courseId) {
          navigate(`/checkout/cancel?courseId=${courseId}`, { replace: true });
        } else {
          navigate('/checkout/cancel', { replace: true });
        }
        return;
      }

      // Check if we should start monitoring for payment status
      // Only start monitoring if we're coming from checkout or have recent checkout activity
      const checkoutStartTime = sessionStorage.getItem('checkoutStartTime');
      const pendingCourseId = sessionStorage.getItem('pendingCourseId');
      const isRecentCheckout = checkoutStartTime && (Date.now() - parseInt(checkoutStartTime)) < 5 * 60 * 1000; // 5 minutes
      
      if (paymentService.shouldStartMonitoring() && 
          isRecentCheckout &&
          !location.pathname.includes('/checkout/success') && 
          !location.pathname.includes('/checkout/cancel') &&
          !location.pathname.includes('/checkout/failure')) {
        
        console.log('🔍 Starting payment monitoring for course:', pendingCourseId);
        paymentService.startPaymentMonitoring(pendingCourseId!, sessionStorage.getItem('stripeSessionId') || undefined);
      }

      // Check for timeout scenarios - only if we have recent checkout activity
      if (checkoutStartTime && pendingCourseId && isRecentCheckout) {
        const currentTime = Date.now();
        const startTime = parseInt(checkoutStartTime);
        const timeElapsed = currentTime - startTime;
        
        // If more than 10 minutes have passed and we're not on success/cancel/failure pages, assume failure
        if (timeElapsed > 10 * 60 * 1000 && 
            !location.pathname.includes('/checkout/success') && 
            !location.pathname.includes('/checkout/cancel') &&
            !location.pathname.includes('/checkout/failure')) {
          console.log('⏰ Payment timeout detected - redirecting to failure page');
          navigate(`/checkout/failure?courseId=${pendingCourseId}`, { replace: true });
          return;
        }
      }
      
      // Clean up old session data if checkout is not recent
      if (!isRecentCheckout && pendingCourseId) {
        console.log('🧹 Cleaning up old checkout session data');
        sessionStorage.removeItem('pendingCourseId');
        sessionStorage.removeItem('checkoutStartTime');
        sessionStorage.removeItem('stripeSessionId');
      }
    };

    // Run the check immediately
    checkForPaymentFailure();

    // Also listen for beforeunload events to detect if user is leaving the page
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const storedSessionId = sessionStorage.getItem('stripeSessionId');
      const pendingCourseId = sessionStorage.getItem('pendingCourseId');
      
      if (storedSessionId && pendingCourseId) {
        // User is leaving the page during checkout - this might indicate a failure
        console.log('⚠️ User leaving page during checkout - might be a payment failure');
        // Don't prevent the unload, but log it for debugging
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Stop payment monitoring when component unmounts
      paymentService.stopPaymentMonitoring();
    };
  }, [navigate, location, paymentService]);

  // This component doesn't render anything
  return null;
};

export default PaymentFailureHandler;
