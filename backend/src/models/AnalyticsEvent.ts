import mongoose, { Schema, Document } from 'mongoose';

/**
 * Analytics event types that can be tracked.
 * Extend this union as new events are needed.
 */
export type AnalyticsEventType =
  | 'page_view'
  | 'game_click'
  | 'product_select'
  | 'verify_player'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'search';

export interface IAnalyticsEvent extends Document {
  /** The type/category of event being tracked */
  event_type: AnalyticsEventType;
  /** Arbitrary JSON payload with event-specific data */
  event_data: Record<string, unknown>;
  /** The current route path (e.g., '/game/mlbb') */
  page: string;
  /** Game code if applicable (e.g., 'mlbb', 'freefire_sgmy') */
  game_code?: string;
  /** Product code if applicable */
  product_code?: string;
  /** Session identifier — generated client-side, stored in localStorage */
  session_id: string;
  /** Anonymized IP (first 3 octets only) */
  ip_anon: string;
  /** Referrer URL (document.referrer) */
  referrer: string;
  /** User agent string (truncated to 200 chars) */
  user_agent: string;
  /** Timestamp of the event */
  created_at: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    event_type: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'game_click',
        'product_select',
        'verify_player',
        'payment_initiated',
        'payment_completed',
        'payment_failed',
        'search',
      ],
      index: true,
    },
    event_data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    page: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    game_code: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    product_code: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    session_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    ip_anon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    referrer: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    user_agent: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'analytics_events',
  }
);

// ─── Indexes ────────────────────────────────────────────────

// Primary query: stats by type + date range
AnalyticsEventSchema.index({ event_type: 1, created_at: -1 });

// Game-specific stats
AnalyticsEventSchema.index({ game_code: 1, event_type: 1, created_at: -1 });

// Session-based queries (unique visitors)
AnalyticsEventSchema.index({ session_id: 1, created_at: -1 });

// TTL index: auto-delete events older than 90 days
AnalyticsEventSchema.index(
  { created_at: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
    name: 'analytics_ttl',
  }
);

export const AnalyticsEventModel = mongoose.model<IAnalyticsEvent>(
  'AnalyticsEvent',
  AnalyticsEventSchema
);
