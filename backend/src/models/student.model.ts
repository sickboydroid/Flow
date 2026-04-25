/**
 * Student profile.
 *
 * Identified publicly by `enrollment` (printed on the ID) and at the
 * scanner by `rfid`. Both are unique. `search_ngrams` is a denormalized
 * array of trigrams over the searchable fields, regenerated on every
 * save by the pre-save hook below; it powers the typo-tolerant search
 * used by the Students table.
 */

import mongoose, { Schema, Document } from "mongoose";
import { nGrams } from "../utils/ngram.js";

export interface IStudent extends Document {
  enrollment: string;
  rfid: string;
  firstName: string;
  lastName: string;
  picUrl?: string;
  address?: string;
  isHosteller: boolean;
  branch: string;
  year: number;
  gender: "male" | "female" | "other";
  phoneNumber?: string;
  search_ngrams: string[];
}

const StudentSchema: Schema = new Schema(
  {
    enrollment: { type: String, required: true, unique: true },
    rfid: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    picUrl: { type: String },
    address: { type: String },
    isHosteller: { type: Boolean, default: false },
    branch: { type: String, required: true },
    year: { type: Number, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    phoneNumber: { type: String },
    search_ngrams: { type: [String], default: [] }
  },
  { timestamps: true },
);

StudentSchema.pre('save', function() {
  const text = `${this.firstName} ${this.lastName} ${this.enrollment} ${this.rfid}`.trim();
  this.search_ngrams = nGrams(text);
});

StudentSchema.index({ search_ngrams: 1 });

export const Student = mongoose.model<IStudent>("Student", StudentSchema);
