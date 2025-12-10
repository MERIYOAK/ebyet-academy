import { buildApiUrl } from '../config/environment';

interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'unknown';
  sessionId?: string;
  courseId?: string;
  error?: string;
}

class PaymentStatusService {
  private static instance: PaymentStatusService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 2000; // Check every 2 seconds
  private readonly MAX_CHECKS = 30; // Maximum 1 minute of checking
  private checkCount = 0;

  static getInstance(): PaymentStatusService {
    if (!PaymentStatusService.instance) {
      PaymentStatusService.instance = new PaymentStatusService();
    }
    return PaymentStatusService.instance;
  }

  /**
   * Start monitoring for payment status changes
   */
  startPaymentMonitoring(courseId: string, sessionId?: string): void {
    console.log('🔍 Starting payment monitoring...');
    console.log(`   - Course ID: ${courseId}`);
    console.log(`   - Session ID: ${sessionId || 'Not provided'}`);

    this.checkCount = 0;
    this.checkInterval = setInterval(async () => {
      await this.checkPaymentStatus(courseId, sessionId);
      this.checkCount++;

      // Stop checking after max attempts
      if (this.checkCount >= this.MAX_CHECKS) {
        console.log('⏰ Payment monitoring timeout - stopping checks');
        this.stopPaymentMonitoring();
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring for payment status changes
   */
  stopPaymentMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Payment monitoring stopped');
    }
  }

  /**
   * Check the current payment status
   */
  private async checkPaymentStatus(courseId: string, sessionId?: string): Promise<PaymentStatus> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No auth token found - cannot check payment status');
        return { status: 'unknown' };
      }

      // Check if user has purchased the course
      const response = await fetch(buildApiUrl(`/api/payment/check-purchase/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const hasPurchased = data.data?.hasPurchased;

        if (hasPurchased) {
          console.log('✅ Payment successful - course purchased');
          this.stopPaymentMonitoring();
          // Clear session storage
          this.clearSessionData();
          return { status: 'success', courseId };
        }
      }

      // If we've been checking for a while and no purchase, assume failure
      if (this.checkCount > 10) { // After 20 seconds
        console.log('❌ Payment appears to have failed - no purchase detected');
        this.stopPaymentMonitoring();
        // Redirect to failure page
        window.location.href = `/checkout/failure?courseId=${courseId}`;
        return { status: 'failed', courseId, error: 'Payment timeout' };
      }

      return { status: 'pending', courseId };
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      return { status: 'unknown', courseId, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear session storage data
   */
  private clearSessionData(): void {
    sessionStorage.removeItem('stripeSessionId');
    sessionStorage.removeItem('checkoutStartTime');
    sessionStorage.removeItem('pendingCourseId');
  }

  /**
   * Detect payment failure from URL parameters
   */
  detectFailureFromURL(): PaymentStatus | null {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const paymentStatus = urlParams.get('payment_status');
    const errorMessage = urlParams.get('error_description') || urlParams.get('error_message');
    const courseId = urlParams.get('courseId') || sessionStorage.getItem('pendingCourseId');

    if (error || paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      console.log('❌ Payment failure detected from URL parameters');
      return {
        status: 'failed',
        courseId: courseId || undefined,
        error: errorMessage || error || 'Payment failed'
      };
    }

    if (errorMessage && errorMessage.toLowerCase().includes('declined')) {
      console.log('❌ Card declined detected from error message');
      return {
        status: 'failed',
        courseId: courseId || undefined,
        error: 'Card was declined'
      };
    }

    return null;
  }

  /**
   * Check if we should start monitoring based on current state
   */
  shouldStartMonitoring(): boolean {
    const pendingCourseId = sessionStorage.getItem('pendingCourseId');
    const checkoutStartTime = sessionStorage.getItem('checkoutStartTime');
    
    if (!pendingCourseId || !checkoutStartTime) {
      return false;
    }

    const startTime = parseInt(checkoutStartTime);
    const currentTime = Date.now();
    const timeElapsed = currentTime - startTime;

    // Only start monitoring if checkout started recently (within last 10 minutes)
    return timeElapsed < 10 * 60 * 1000;
  }
}

export default PaymentStatusService;
