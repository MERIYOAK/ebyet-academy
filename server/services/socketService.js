/**
 * Socket.IO Service for Real-time Content Updates
 * Handles broadcasting content updates to connected users
 */

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  /**
   * Initialize Socket.IO service with server instance
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    this.io = io;
    console.log('🔌 Socket.IO service initialized');
  }

  /**
   * Update connected users map
   * @param {Map} connectedUsers - Map of connected users
   */
  setConnectedUsers(connectedUsers) {
    this.connectedUsers = connectedUsers;
  }

  /**
   * Broadcast content update to all connected users
   * @param {string} eventType - Type of content update
   * @param {Object} data - Content data to broadcast
   */
  broadcastContentUpdate(eventType, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    console.log(`📢 Broadcasting ${eventType} to ${this.connectedUsers.size} users`);
    this.io.emit('contentUpdate', payload);
  }

  /**
   * Send targeted update to specific users
   * @param {Array} userIds - Array of user IDs to target
   * @param {string} eventType - Type of content update
   * @param {Object} data - Content data to send
   */
  sendTargetedUpdate(userIds, eventType, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    userIds.forEach(userId => {
      // Find sockets for this user
      for (const [socketId, userInfo] of this.connectedUsers.entries()) {
        if (userInfo.userId === userId) {
          this.io.to(socketId).emit('contentUpdate', payload);
          console.log(`📤 Sent ${eventType} to user ${userId}`);
        }
      }
    });
  }

  /**
   * Send update to users with specific role
   * @param {string} role - Role to target (e.g., 'admin', 'user')
   * @param {string} eventType - Type of content update
   * @param {Object} data - Content data to send
   */
  sendRoleBasedUpdate(role, eventType, data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized');
      return;
    }

    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    for (const [socketId, userInfo] of this.connectedUsers.entries()) {
      if (userInfo.role === role) {
        this.io.to(socketId).emit('contentUpdate', payload);
      }
    }

    console.log(`📤 Sent ${eventType} to ${role} users`);
  }

  /**
   * Specific content update methods
   */
  notifyNewCourse(courseData) {
    this.broadcastContentUpdate('NEW_COURSE', {
      course: courseData,
      message: `New course "${courseData.title}" is now available!`
    });
  }

  notifyCourseUpdate(courseData) {
    this.broadcastContentUpdate('COURSE_UPDATED', {
      course: courseData,
      message: `Course "${courseData.title}" has been updated!`
    });
  }

  notifyNewVideo(videoData, courseTitle) {
    this.broadcastContentUpdate('NEW_VIDEO', {
      video: videoData,
      courseTitle: courseTitle,
      message: `New video added to "${courseTitle}"`
    });
  }

  notifyVideoUpdate(videoData, courseTitle) {
    this.broadcastContentUpdate('VIDEO_UPDATED', {
      video: videoData,
      courseTitle: courseTitle,
      message: `Video updated in "${courseTitle}"`
    });
  }

  notifyNewBundle(bundleData) {
    this.broadcastContentUpdate('NEW_BUNDLE', {
      bundle: bundleData,
      message: `New bundle "${bundleData.title}" is now available!`
    });
  }

  notifyBundleUpdate(bundleData) {
    this.broadcastContentUpdate('BUNDLE_UPDATED', {
      bundle: bundleData,
      message: `Bundle "${bundleData.title}" has been updated!`
    });
  }

  notifyNewAnnouncement(announcementData) {
    this.broadcastContentUpdate('NEW_ANNOUNCEMENT', {
      announcement: announcementData,
      message: announcementData.title || 'New announcement available!'
    });
  }

  notifyAnnouncementUpdate(announcementData) {
    this.broadcastContentUpdate('ANNOUNCEMENT_UPDATED', {
      announcement: announcementData,
      message: 'Announcement has been updated!'
    });
  }

  notifyAnnouncementDeletion(announcementData) {
    this.broadcastContentUpdate('ANNOUNCEMENT_DELETED', {
      announcement: announcementData,
      message: 'Announcement has been deleted!'
    });
  }

  /**
   * Review-related notification methods
   */
  notifyReviewApproved(reviewData) {
    this.broadcastContentUpdate('REVIEW_APPROVED', {
      review: reviewData,
      message: `Review for "${reviewData.courseTitle}" has been approved`
    });
  }

  notifyReviewRejected(reviewData) {
    this.broadcastContentUpdate('REVIEW_REJECTED', {
      review: reviewData,
      message: `Review for "${reviewData.courseTitle}" has been rejected`
    });
  }

  notifyReviewReplyAdded(reviewData) {
    this.broadcastContentUpdate('REVIEW_REPLY_ADDED', {
      review: reviewData,
      message: `Admin replied to review for "${reviewData.courseTitle}"`
    });
  }

  notifyCourseMaterialsUpdated(courseData) {
    this.broadcastContentUpdate('COURSE_MATERIALS_UPDATED', {
      course: courseData,
      message: `Materials for "${courseData.title}" have been updated`
    });
  }

  notifyWhatsappGroupUpdated(courseData) {
    this.broadcastContentUpdate('WHATSAPP_GROUP_UPDATED', {
      course: courseData,
      message: `WhatsApp group for "${courseData.title}" has been updated`
    });
  }

  /**
   * Get statistics about connected users
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedUsers.size,
      usersByRole: {},
      connectionsByUser: {}
    };

    for (const [socketId, userInfo] of this.connectedUsers.entries()) {
      // Count by role
      stats.usersByRole[userInfo.role] = (stats.usersByRole[userInfo.role] || 0) + 1;
      
      // Count connections per user
      stats.connectionsByUser[userInfo.userId] = (stats.connectionsByUser[userInfo.userId] || 0) + 1;
    }

    return stats;
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;
