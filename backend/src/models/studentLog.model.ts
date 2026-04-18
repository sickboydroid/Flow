import mongoose, { Schema, Document } from "mongoose";

export interface IStudentLog extends Document {
  enrollment: string;
  type: "ENTRY_IN" | "ENTRY_OUT";
  timestamp: Date;
  denied: boolean;
  lastedit_timestamp: Date;
  update_count: number;
}

const StudentLogSchema: Schema = new Schema(
  {
    enrollment: { type: String, required: true, ref: "Student" },
    type: { type: String, enum: ["ENTRY_IN", "ENTRY_OUT"], required: true },
    timestamp: { type: Date, default: Date.now },
    denied: { type: Boolean, default: false },
    lastedit_timestamp: { type: Date, default: Date.now },
    update_count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const StudentLog = mongoose.model<IStudentLog>(
  "StudentLog",
  StudentLogSchema,
);
