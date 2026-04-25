/**
 * Student entry/exit log.
 *
 * Linked to a `Student` via the `enrollment` field (no ObjectId here —
 * we deliberately key by the human enrollment code so logs survive a
 * student document being recreated). `deleted` is a soft-delete flag;
 * the API filters those out by default. The `student` virtual joins
 * back to the parent profile when `populate("student")` is called.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IStudentLog extends Document {
  enrollment: string;
  type: "IN" | "OUT" | "LEAVE";
  timestamp: Date;
  deleted: boolean;
  mode_of_entry: "RFID" | "MANUAL";
  remarks?: string;
}

const StudentLogSchema: Schema = new Schema(
  {
    enrollment: { type: String, required: true, ref: "Student" },
    type: { type: String, enum: ["IN", "OUT", "LEAVE"], required: true },
    timestamp: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false },
    mode_of_entry: { type: String, enum: ["RFID", "MANUAL"], default: "RFID" },
    remarks: { type: String }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

StudentLogSchema.index({ timestamp: -1 });

StudentLogSchema.virtual("student", {
  ref: "Student",
  localField: "enrollment",
  foreignField: "enrollment",
  justOne: true,
});

export const StudentLog = mongoose.model<IStudentLog>(
  "StudentLog",
  StudentLogSchema,
);
