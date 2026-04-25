/**
 * Generic key/value usage counter.
 *
 * Used to power autocomplete hints in the Add Entry forms. Whenever an
 * operator types a new vehicle type or visitor department, the relevant
 * controller upserts `(type, key)` and bumps `count`. The `/api/hints`
 * endpoint then returns the most-used keys for a given type, ordered
 * by `count` desc.
 *
 * Examples:
 *   { type: "vehicle_type",       key: "Bike",   count: 42 }
 *   { type: "visitor_department", key: "Admin",  count: 7  }
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IMetadata extends Document {
  /** Logical bucket, e.g. "vehicle_type" or "visitor_department". */
  type: string;
  /** The user-typed key inside that bucket. */
  key: string;
  /** Times this `(type, key)` pair has been seen. */
  count: number;
  /** Optional free-form payload for richer hints in the future. */
  data: unknown;
}

const metadataSchema = new Schema<IMetadata>({
  type: { type: String, required: true },
  key: { type: String, required: true },
  count: { type: Number, default: 1 },
  data: { type: Schema.Types.Mixed }
}, { timestamps: true });

metadataSchema.index({ type: 1, key: 1 }, { unique: true });
metadataSchema.index({ type: 1, count: -1 });

export const Metadata = mongoose.model<IMetadata>('Metadata', metadataSchema);
