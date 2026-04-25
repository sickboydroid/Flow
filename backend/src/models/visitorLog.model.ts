/**
 * Visitor record.
 *
 * Created when someone signs in at the desk and updated to
 * `has_left=true` (with `time_out`) when they leave. We index
 * `has_left` so the "currently inside" filter on the Visitors tab
 * stays fast even as the table grows.
 */

import mongoose, { Schema, Document } from "mongoose";
import { nGrams } from "../utils/ngram.js";

export interface IVisitorLog extends Document {
  timestamp: Date;
  first_name: string;
  last_name: string;
  address?: string;
  time_in: Date;
  time_out?: Date;
  department?: string;
  has_left: boolean;
  remarks?: string;
  search_ngrams: string[];
}

const visitorLogSchema = new Schema<IVisitorLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  address: { type: String },
  time_in: { type: Date, default: Date.now },
  time_out: { type: Date },
  department: { type: String },
  has_left: { type: Boolean, default: false, index: true },
  remarks: { type: String },
  search_ngrams: { type: [String], default: [] }
}, { timestamps: true });

visitorLogSchema.pre('save', function() {
  const dataToFuzzyMatch = `${this.first_name} ${this.last_name} ${this.address || ''} ${this.remarks || ''}`.trim();
  this.search_ngrams = nGrams(dataToFuzzyMatch);
});

// Indexes
visitorLogSchema.index({ timestamp: -1 }); 
visitorLogSchema.index({ search_ngrams: 1 });

export const VisitorLog = mongoose.model<IVisitorLog>('VisitorLog', visitorLogSchema);
