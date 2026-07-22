import { Request, Response } from 'express';
import { AnnouncementModel } from '../models/Announcement';

/**
 * ─── Public Endpoint ──────────────────────────────────
 * GET /announcements
 * Returns all currently active announcements (within date range).
 * No auth required — used by the main site banner.
 */
export async function getActiveAnnouncements(
  _req: Request,
  res: Response
) {
  try {
    const now = new Date();
    const announcements = await AnnouncementModel.find({
      is_active: true,
      $and: [
        {
          $or: [
            { starts_at: { $exists: false } },
            { starts_at: null },
            { starts_at: { $lte: now } },
          ],
        },
        {
          $or: [
            { expires_at: { $exists: false } },
            { expires_at: null },
            { expires_at: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ created_at: -1 })
      .lean();

    return res.json({
      success: true,
      message: 'Active announcements fetched',
      data: announcements,
    });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
    });
  }
}

/**
 * ─── Admin Endpoints (all require verifyToken) ───────
 */

// GET /admin/announcements
export async function getAllAnnouncements(
  _req: Request,
  res: Response
) {
  try {
    const announcements = await AnnouncementModel.find()
      .sort({ created_at: -1 })
      .lean();
    return res.json({
      success: true,
      message: 'Announcements fetched',
      data: announcements,
    });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
    });
  }
}

// POST /admin/announcements
export async function createAnnouncement(
  req: Request,
  res: Response
) {
  try {
    const { title, message, type, is_active, link_url, link_label, dismissible, starts_at, expires_at } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    const announcement = await AnnouncementModel.create({
      title,
      message,
      type: type || 'info',
      is_active: is_active !== undefined ? is_active : true,
      link_url,
      link_label,
      dismissible: dismissible !== undefined ? dismissible : true,
      starts_at: starts_at || undefined,
      expires_at: expires_at || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement created',
      data: announcement,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
    });
  }
}

// PUT /admin/announcements/:id
export async function updateAnnouncement(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.created_at;

    const announcement = await AnnouncementModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    return res.json({
      success: true,
      message: 'Announcement updated',
      data: announcement,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
    });
  }
}

// DELETE /admin/announcements/:id
export async function deleteAnnouncement(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const announcement = await AnnouncementModel.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    return res.json({
      success: true,
      message: 'Announcement deleted',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
    });
  }
}

// PATCH /admin/announcements/:id/toggle
export async function toggleAnnouncement(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const announcement = await AnnouncementModel.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    announcement.is_active = !announcement.is_active;
    await announcement.save();

    return res.json({
      success: true,
      message: `Announcement ${announcement.is_active ? 'activated' : 'deactivated'}`,
      data: announcement,
    });
  } catch (error) {
    console.error('Error toggling announcement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle announcement',
    });
  }
}
