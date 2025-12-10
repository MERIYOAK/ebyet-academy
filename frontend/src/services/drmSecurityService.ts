import CryptoJS from 'crypto-js';

export interface DRMSession {
  sessionId: string;
  userId: string;
  videoId: string;
  expiresAt: number;
  encryptionKey: string;
  watermarkData: string;
  accessToken: string;
}

export interface SecurityConfig {
  enableDRM: boolean;
  enableWatermarking: boolean;
  enableScreenRecordingDetection: boolean;
  enableExtensionDetection: boolean;
  enableForensicWatermarking: boolean;
  sessionTimeout: number; // in minutes
  watermarkOpacity: number;
  watermarkSize: number;
}

export class DRMSecurityService {
  private static instance: DRMSecurityService;
  private config: SecurityConfig;
  private currentSession: DRMSession | null = null;
  private securityChecks: Map<string, boolean> = new Map();
  private watermarkCanvas: HTMLCanvasElement | null = null;
  private screenRecordingDetected = false;
  private extensionDetected = false;

  private constructor() {
    this.config = {
      enableDRM: true,
      enableWatermarking: true,
      enableScreenRecordingDetection: true,
      enableExtensionDetection: true,
      enableForensicWatermarking: true,
      sessionTimeout: 60, // 1 hour
      watermarkOpacity: 0.1,
      watermarkSize: 24
    };
  }

  public static getInstance(): DRMSecurityService {
    if (!DRMSecurityService.instance) {
      DRMSecurityService.instance = new DRMSecurityService();
    }
    return DRMSecurityService.instance;
  }

  /**
   * Initialize DRM session for video playback
   */
  public async initializeSession(userId: string, videoId: string): Promise<DRMSession> {
    try {
      const sessionId = this.generateSessionId();
      const encryptionKey = this.generateEncryptionKey();
      const watermarkData = this.generateWatermarkData(userId, videoId);
      const accessToken = this.generateAccessToken(userId, videoId, sessionId);

      this.currentSession = {
        sessionId,
        userId,
        videoId,
        expiresAt: Date.now() + (this.config.sessionTimeout * 60 * 1000),
        encryptionKey,
        watermarkData,
        accessToken
      };

      // Store session in localStorage for persistence
      localStorage.setItem('drm_session', JSON.stringify(this.currentSession));

      // Initialize security checks
      await this.initializeSecurityChecks();

      console.log('🔒 DRM Session initialized:', sessionId);
      return this.currentSession;
    } catch (error) {
      console.error('❌ Failed to initialize DRM session:', error);
      throw error;
    }
  }

  /**
   * Get current DRM session
   */
  public getCurrentSession(): DRMSession | null {
    if (this.currentSession && this.currentSession.expiresAt > Date.now()) {
      return this.currentSession;
    }
    return null;
  }

  /**
   * Validate DRM session
   */
  public validateSession(): boolean {
    const session = this.getCurrentSession();
    if (!session) {
      console.warn('⚠️ DRM session expired or not found');
      return false;
    }
    return true;
  }

  /**
   * Decrypt video URL using DRM key
   */
  public decryptVideoUrl(encryptedUrl: string): string {
    if (!this.currentSession) {
      throw new Error('No active DRM session');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedUrl, this.currentSession.encryptionKey).toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error('❌ Failed to decrypt video URL:', error);
      throw new Error('Failed to decrypt video URL');
    }
  }

  /**
   * Generate user-specific watermark
   */
  public generateUserWatermark(userId: string, videoId: string): string {
    const timestamp = Date.now();
    const userHash = CryptoJS.SHA256(userId + videoId + timestamp).toString().substring(0, 8);
    return `${userId.substring(0, 4)}-${userHash}`;
  }

  /**
   * Create watermark canvas overlay
   */
  public createWatermarkOverlay(width: number, height: number): HTMLCanvasElement {
    if (!this.currentSession) {
      throw new Error('No active DRM session');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Set watermark properties
    ctx.font = `${this.config.watermarkSize}px Arial`;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.config.watermarkOpacity})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Create watermark pattern
    const watermarkText = this.currentSession.watermarkData;
    const spacing = 200;
    
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 6); // 30 degree rotation
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }

    return canvas;
  }

  /**
   * Detect screen recording attempts
   */
  public async detectScreenRecording(): Promise<boolean> {
    if (!this.config.enableScreenRecordingDetection) {
      return false;
    }

    try {
      // Method 1: Check for Windows Game Bar specifically
      if (await this.detectWindowsGameBar()) {
        this.screenRecordingDetected = true;
        return true;
      }

      // Method 2: Check for screen capture API usage
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        const hasScreenCapture = await this.checkScreenCaptureAPI();
        if (hasScreenCapture) {
          this.screenRecordingDetected = true;
          return true;
        }
      }

      // Method 3: Monitor for recording indicators
      const recordingIndicators = this.detectRecordingIndicators();
      if (recordingIndicators) {
        this.screenRecordingDetected = true;
        return true;
      }

      // Method 4: Check for known recording software
      const recordingSoftware = this.detectRecordingSoftware();
      if (recordingSoftware) {
        this.screenRecordingDetected = true;
        return true;
      }

      // Method 5: Monitor for system-level recording processes
      if (await this.detectSystemRecordingProcesses()) {
        this.screenRecordingDetected = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Screen recording detection error:', error);
      return false;
    }
  }

  /**
   * Detect browser extensions
   */
  public async detectBrowserExtensions(): Promise<boolean> {
    if (!this.config.enableExtensionDetection) {
      return false;
    }

    try {
      // Method 1: Check for common download extensions
      const downloadExtensions = [
        'video-downloader',
        'youtube-downloader',
        'video-saver',
        'media-downloader'
      ];

      for (const extension of downloadExtensions) {
        if (this.checkExtensionInstalled(extension)) {
          this.extensionDetected = true;
          return true;
        }
      }

      // Method 2: Check for developer tools
      if (this.detectDeveloperTools()) {
        this.extensionDetected = true;
        return true;
      }

      // Method 3: Monitor for suspicious network requests
      if (this.detectSuspiciousRequests()) {
        this.extensionDetected = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Extension detection error:', error);
      return false;
    }
  }

  /**
   * Perform comprehensive security check
   */
  public async performSecurityCheck(): Promise<{
    isSecure: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Check DRM session
    if (!this.validateSession()) {
      violations.push('Invalid or expired DRM session');
    }

    // Check for screen recording
    if (await this.detectScreenRecording()) {
      violations.push('Screen recording detected');
    }

    // Check for browser extensions
    if (await this.detectBrowserExtensions()) {
      violations.push('Suspicious browser extensions detected');
    }

    // Check for developer tools
    if (this.detectDeveloperTools()) {
      violations.push('Developer tools detected');
    }

    // Check for virtual machines
    if (this.detectVirtualMachine()) {
      violations.push('Virtual machine environment detected');
    }

    const isSecure = violations.length === 0;
    
    if (!isSecure) {
      console.warn('🚨 Security violations detected:', violations);
    }

    return { isSecure, violations };
  }

  /**
   * Clear DRM session
   */
  public clearSession(): void {
    this.currentSession = null;
    localStorage.removeItem('drm_session');
    this.securityChecks.clear();
    console.log('🔒 DRM session cleared');
  }

  // Private helper methods
  private generateSessionId(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private generateWatermarkData(userId: string, videoId: string): string {
    const timestamp = Date.now();
    return CryptoJS.SHA256(userId + videoId + timestamp).toString().substring(0, 12);
  }

  private generateAccessToken(userId: string, videoId: string, sessionId: string): string {
    const payload = { userId, videoId, sessionId, timestamp: Date.now() };
    return CryptoJS.AES.encrypt(JSON.stringify(payload), 'drm-secret-key').toString();
  }

  private async initializeSecurityChecks(): Promise<void> {
    // Set up periodic security checks
    setInterval(async () => {
      await this.performSecurityCheck();
    }, 30000); // Check every 30 seconds
  }

  private async checkScreenCaptureAPI(): Promise<boolean> {
    try {
      // This is a simplified check - in reality, you'd need more sophisticated detection
      return false;
    } catch (error) {
      return false;
    }
  }

  private detectRecordingIndicators(): boolean {
    // Check for common recording indicators
    const indicators = [
      'OBS Studio',
      'Bandicam',
      'Fraps',
      'Camtasia',
      'ScreenFlow'
    ];

    // This is a simplified check - in reality, you'd need more sophisticated detection
    return false;
  }

  private detectRecordingSoftware(): boolean {
    // Check for known recording software processes
    // This would require more advanced detection methods
    return false;
  }

  private checkExtensionInstalled(extensionName: string): boolean {
    // Check if specific extension is installed
    // This is a simplified check - in reality, you'd need more sophisticated detection
    return false;
  }

  private detectDeveloperTools(): boolean {
    // Detect if developer tools are open
    const threshold = 160;
    return (
      window.outerHeight - window.innerHeight > threshold ||
      window.outerWidth - window.innerWidth > threshold
    );
  }

  private detectVirtualMachine(): boolean {
    // Detect virtual machine environment
    const vmIndicators = [
      'VirtualBox',
      'VMware',
      'QEMU',
      'Xen'
    ];

    const userAgent = navigator.userAgent.toLowerCase();
    return vmIndicators.some(indicator => userAgent.includes(indicator.toLowerCase()));
  }

  private detectSuspiciousRequests(): boolean {
    // Monitor for suspicious network requests
    // This would require intercepting network requests
    return false;
  }

  /**
   * Detect Windows Game Bar specifically
   */
  private async detectWindowsGameBar(): Promise<boolean> {
    try {
      // Method 1: Check for Game Bar overlay indicators
      if (this.detectGameBarOverlay()) {
        console.warn('🚨 Windows Game Bar overlay detected');
        return true;
      }

      // Method 2: Monitor for Game Bar specific keyboard shortcuts
      if (this.detectGameBarShortcuts()) {
        console.warn('🚨 Windows Game Bar shortcuts detected');
        return true;
      }

      // Method 3: Check for Game Bar process indicators
      if (await this.detectGameBarProcess()) {
        console.warn('🚨 Windows Game Bar process detected');
        return true;
      }

      // Method 4: Monitor for Game Bar API calls
      if (this.detectGameBarAPI()) {
        console.warn('🚨 Windows Game Bar API detected');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Game Bar detection error:', error);
      return false;
    }
  }

  /**
   * Detect Game Bar overlay indicators
   */
  private detectGameBarOverlay(): boolean {
    // Check for Game Bar overlay elements in DOM
    const gameBarSelectors = [
      '[data-testid="gamebar-overlay"]',
      '.gamebar-overlay',
      '#gamebar-overlay',
      '[class*="gamebar"]',
      '[class*="xbox"]'
    ];

    for (const selector of gameBarSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    // Check for Game Bar specific CSS classes or attributes
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const className = element.className?.toString().toLowerCase() || '';
      const id = element.id?.toLowerCase() || '';
      
      if (className.includes('gamebar') || 
          className.includes('xbox') || 
          id.includes('gamebar') || 
          id.includes('xbox')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect Game Bar keyboard shortcuts
   */
  private detectGameBarShortcuts(): boolean {
    // This would need to be implemented with a global key listener
    // We'll track this in the SecureVideoPlayer component
    return false;
  }

  /**
   * Detect Game Bar process indicators
   */
  private async detectGameBarProcess(): Promise<boolean> {
    try {
      // Check for Game Bar related user agent strings or system info
      const userAgent = navigator.userAgent.toLowerCase();
      const platform = navigator.platform.toLowerCase();
      
      // Check for Windows and potential Game Bar indicators
      if (platform.includes('win') && userAgent.includes('windows')) {
        // Additional checks for Game Bar specific indicators
        if (this.checkForGameBarRegistry()) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for Game Bar registry indicators (limited browser access)
   */
  private checkForGameBarRegistry(): boolean {
    // This is limited in browser context, but we can check for other indicators
    // Check for Game Bar related localStorage or sessionStorage
    const gameBarKeys = [
      'gamebar',
      'xbox',
      'game-dvr',
      'gamebar-overlay'
    ];

    for (const key of gameBarKeys) {
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect Game Bar API usage
   */
  private detectGameBarAPI(): boolean {
    // Check for Game Bar related APIs or objects
    const gameBarAPIs = [
      'GameBar',
      'XboxGameBar',
      'GameDVR',
      'GameBarAPI'
    ];

    for (const api of gameBarAPIs) {
      if ((window as any)[api]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect system-level recording processes
   */
  private async detectSystemRecordingProcesses(): Promise<boolean> {
    try {
      // Method 1: Check for recording software window titles
      const recordingSoftware = [
        'OBS Studio',
        'Bandicam',
        'Fraps',
        'Camtasia',
        'ScreenFlow',
        'Loom',
        'Screencastify',
        'Game Bar',
        'Xbox Game Bar',
        'Windows Game Bar',
        'Game DVR',
        'ShadowPlay',
        'Relive',
        'Action!',
        'HyperCam',
        'ScreenRecorder',
        'RecordIt',
        'Screencast-O-Matic'
      ];

      // Check document title for recording software indicators
      const documentTitle = document.title.toLowerCase();
      for (const software of recordingSoftware) {
        if (documentTitle.includes(software.toLowerCase())) {
          console.warn(`🚨 Recording software detected in title: ${software}`);
          return true;
        }
      }

      // Method 2: Monitor for recording-related DOM changes
      if (this.detectRecordingDOMChanges()) {
        return true;
      }

      // Method 3: Check for recording-related performance indicators
      if (this.detectRecordingPerformanceIndicators()) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ System recording process detection error:', error);
      return false;
    }
  }

  /**
   * Detect recording-related DOM changes
   */
  private detectRecordingDOMChanges(): boolean {
    // Monitor for elements that might indicate recording software
    // Use more specific indicators to avoid false positives
    const recordingIndicators = [
      'obs-studio',
      'xsplit',
      'bandicam',
      'fraps',
      'camtasia',
      'screen-recorder',
      'game-recorder',
      'streaming-software'
    ];

    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toString().toLowerCase() || '';
      const id = element.id?.toLowerCase() || '';

      for (const indicator of recordingIndicators) {
        if (text.includes(indicator) || 
            className.includes(indicator) || 
            id.includes(indicator)) {
          // Additional validation to avoid false positives
          if (this.isLikelyRecordingIndicator(element, indicator)) {
            console.warn(`🚨 Recording indicator detected: ${indicator}`);
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Validate if an element is likely a recording indicator
   */
  private isLikelyRecordingIndicator(element: Element, indicator: string): boolean {
    // Check for common recording indicator patterns
    const recordingPatterns = [
      /recording/i,
      /record/i,
      /capture/i,
      /stream/i,
      /live/i,
      /broadcast/i
    ];

    const elementText = element.textContent || '';
    const elementClass = element.className?.toString() || '';
    const elementId = element.id || '';

    for (const pattern of recordingPatterns) {
      if (pattern.test(elementText) || 
          pattern.test(elementClass) || 
          pattern.test(elementId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect recording performance indicators
   */
  private detectRecordingPerformanceIndicators(): boolean {
    try {
      // Monitor for performance indicators that might suggest recording
      const performance = window.performance;
      
      if (performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        
        // Check for unusual memory usage patterns that might indicate recording
        if (memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
          console.warn('🚨 High memory usage detected (possible recording)');
          return true;
        }
      }

      // Check for unusual frame rate drops that might indicate recording
      let frameCount = 0;
      let lastTime = performance.now();
      let lowFpsCount = 0; // Track consecutive low FPS readings
      
      const checkFrameRate = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) { // Check every second
          const fps = frameCount;
          frameCount = 0;
          lastTime = currentTime;
          
          // Only flag extremely low FPS that persists for multiple seconds
          // This helps avoid false positives from temporary performance dips
          if (fps < 10) {
            lowFpsCount++;
            // Only trigger after 3 consecutive seconds of very low FPS
            if (lowFpsCount >= 3) {
              console.warn('🚨 Persistent extremely low frame rate detected (possible recording)');
              return true;
            }
          } else {
            lowFpsCount = 0; // Reset counter if FPS is normal
          }
        }
        
        requestAnimationFrame(checkFrameRate);
      };

      // Start monitoring (this will run continuously)
      requestAnimationFrame(checkFrameRate);

      return false;
    } catch (error) {
      return false;
    }
  }
}

export default DRMSecurityService;
