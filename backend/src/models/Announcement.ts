import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  is_active: boolean;
  link_url?: string;
  link_label?: string;
  dismissible: boolean;
  starts_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'promo'],
      default: 'info',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    link_url: { type: String, trim: true },
    link_label: { type: String, trim: true, maxlength: 60 },
    dismissible: {
      type: Boolean,
      default: true,
    },
    starts_at: { type: Date },
    expires_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'announcements',
  }
);

// Index for fetching active announcements efficiently
AnnouncementSchema.index({ is_active: 1, starts_at: 1, expires_at: 1 });

export const AnnouncementModel = mongoose.model<IAnnouncement>(
  'Announcement',
  AnnouncementSchema
);
