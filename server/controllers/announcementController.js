const Announcement = require('../models/Announcement');

// Get all active announcements (public)
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-createdBy -updatedAt')
      .lean();

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all announcements (admin only)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single announcement by ID (admin only)
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new announcement (admin only)
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, date, isActive, order } = req.body;

    // Validation
    if (!title || !title.en || !title.tg) {
      return res.status(400).json({
        success: false,
        message: 'Title in both English and Tigrinya is required'
      });
    }

    if (!content || !content.en || !content.tg) {
      return res.status(400).json({
        success: false,
        message: 'Content in both English and Tigrinya is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const announcement = new Announcement({
      title: {
        en: title.en.trim(),
        tg: title.tg.trim()
      },
      content: {
        en: content.en.trim(),
        tg: content.tg.trim()
      },
      date: date.trim(),
      isActive: isActive !== undefined ? isActive : true,
      order: order !== undefined ? order : 0,
      createdBy: req.admin?.email || 'admin'
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update announcement (admin only)
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, date, isActive, order } = req.body;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Update fields if provided
    if (title) {
      if (title.en !== undefined) announcement.title.en = title.en.trim();
      if (title.tg !== undefined) announcement.title.tg = title.tg.trim();
    }

    if (content) {
      if (content.en !== undefined) announcement.content.en = content.en.trim();
      if (content.tg !== undefined) announcement.content.tg = content.tg.trim();
    }

    if (date !== undefined) announcement.date = date.trim();
    if (isActive !== undefined) announcement.isActive = isActive;
    if (order !== undefined) announcement.order = order;

    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete announcement (admin only)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};










