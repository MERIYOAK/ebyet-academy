const express = require('express');
const router = express.Router();
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

// Public route - Get active announcements
router.get('/active', getActiveAnnouncements);

// Admin routes - require authentication
router.get('/', adminAuthMiddleware, getAllAnnouncements);
router.get('/:id', adminAuthMiddleware, getAnnouncementById);
router.post('/', adminAuthMiddleware, createAnnouncement);
router.put('/:id', adminAuthMiddleware, updateAnnouncement);
router.delete('/:id', adminAuthMiddleware, deleteAnnouncement);

module.exports = router;











