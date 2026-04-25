/**
 * Vehicle entry/exit log.
 *
 * Plates are normalized to upper-case so comparing them is trivial.
 * Compound index on (plate, timestamp desc) makes the per-plate history
 * page in the dialog cheap; the timestamp-only index serves the Vehicles
 * tab's cursor pagination.
 */

import mongoose, { Schema, Document } from "mongoose";
import { nGrams } from "../utils/ngram.js";

export interface IVehicleLog extends Document {
  timestamp: Date;
  plate: string;      // Normalized uppercase
  type_of_vehicle: string;
  type: 'IN' | 'OUT';
  remarks?: string;
  search_ngrams: string[]; // For typo-tolerant fuzzy searching
}

const vehicleLogSchema = new Schema<IVehicleLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  plate: { type: String, required: true, uppercase: true, trim: true },
  type_of_vehicle: { type: String, required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  remarks: { type: String },
  search_ngrams: { type: [String], default: [] }
}, { timestamps: true });

vehicleLogSchema.pre('save', function() {
  const dataToFuzzyMatch = `${this.plate} ${this.type_of_vehicle} ${this.remarks || ''}`.trim();
  this.search_ngrams = nGrams(dataToFuzzyMatch);
});

// Indexes
vehicleLogSchema.index({ timestamp: -1 });      // For cursor pagination
vehicleLogSchema.index({ plate: 1, timestamp: -1 }); // Identifying a vehicle's history
vehicleLogSchema.index({ search_ngrams: 1 });   // For fuzzy searching

export const VehicleLog = mongoose.model<IVehicleLog>('VehicleLog', vehicleLogSchema);
