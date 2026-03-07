const fs = require('fs');

// Read the current file
let content = fs.readFileSync('videoRoutes.js', 'utf8');

// Find the location to insert the Socket.IO emission
const targetPattern = /    });\s*  } catch \(error\) {/;
const replacement = `    });

    // Emit real-time update to connected users
    try {
      const socketService = req.app.get('socketService');
      if (socketService) {
        // Get course information for the broadcast
        const Course = require('../models/Course');
        const course = await Course.findById(courseId);
        const courseTitle = course ? (typeof course.title === 'string' ? course.title : course.title?.en || 'Course') : 'Course';
        
        console.log('📢 [save-metadata] Emitting NEW_VIDEO event to connected users');
        socketService.broadcastContentUpdate('NEW_VIDEO', {
          video: video,
          courseId: courseId,
          courseTitle: courseTitle,
          message: \`New video "\${video.title}" added to course\`
        });
      }
    } catch (socketError) {
      console.warn('⚠️ [save-metadata] Failed to emit Socket.IO update:', socketError);
    }
  } catch (error) {`;

// Replace the pattern
content = content.replace(targetPattern, replacement);

// Write back to the file
fs.writeFileSync('videoRoutes.js', content);
console.log('✅ Socket.IO emission added to save-metadata function');
