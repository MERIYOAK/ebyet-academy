/**
 * Socket.IO Client Service for Real-time Content Updates
 * Handles connection to server and content update events
 */

import { io, Socket } from 'socket.io-client';

interface ContentUpdatePayload {
  type: string;
  data: any;
  timestamp: string;
}

interface UserData {
  userId: string;
  role: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Get server URL based on environment
   */
  private getServerUrl(): string {
    // Check for existing API base URL environment variable
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }

    // Production: use current domain for same-origin requests
    if (import.meta.env.PROD) {
      // If frontend and backend are on same domain
      return window.location.origin;
    }

    // Development: fallback to localhost
    return 'http://localhost:5000';
  }

  /**
   * Connect to Socket.IO server
   */
  connect(userData?: UserData): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      // Dynamic server URL for production/development
      const serverUrl = this.getServerUrl();
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to Socket.IO server');
        console.log('🔌 Socket ID:', this.socket?.id);
        console.log('🔌 Connection status:', this.socket?.connected);
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Authenticate user if data provided
        if (userData) {
          this.authenticate(userData);
        }

        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from Socket.IO server:', reason);
        this.handleDisconnection(reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Socket.IO connection error:', error);
        this.isConnecting = false;
        this.handleConnectionError(error);
        reject(error);
      });

      this.socket.on('contentUpdate', (payload: ContentUpdatePayload) => {
        this.handleContentUpdate(payload);
      });
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Authenticate user with Socket.IO server
   */
  authenticate(userData: UserData): void {
    if (this.socket?.connected) {
      this.socket.emit('authenticate', userData);
      console.log('👤 Sent authentication data:', userData);
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Add event listener for content updates
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Handle content update events
   */
  private handleContentUpdate(payload: ContentUpdatePayload): void {
    console.log('📢 Received content update:', payload);

    // Trigger specific event listeners
    const listeners = this.eventListeners.get(payload.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload); // Pass full payload instead of just data
        } catch (error) {
          console.error('Error in content update listener:', error);
        }
      });
    }

    // Trigger general content update listeners
    const generalListeners = this.eventListeners.get('contentUpdate');
    if (generalListeners) {
      generalListeners.forEach(callback => {
        try {
          callback(payload); // Pass full payload instead of just data
        } catch (error) {
          console.error('Error in general content update listener:', error);
        }
      });
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection(reason: string): void {
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, don't reconnect automatically
      console.log('🔌 Server disconnected, manual reconnection required');
      return;
    }

    // Attempt to reconnect
    this.attemptReconnection();
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(_error: Error): void {
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect to server
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔌 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect().catch(() => {
          console.error('🔌 Reconnection failed');
        });
      }
    }, delay);
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, optionally disconnect to save resources
        // this.disconnect();
      } else {
        // Page is visible, ensure connection
        if (!this.isConnected()) {
          this.connect().catch(console.error);
        }
      }
    });

    // Handle browser online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Browser is online, attempting to connect...');
      this.connect().catch(console.error);
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Browser is offline');
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
export type { ContentUpdatePayload, UserData };
