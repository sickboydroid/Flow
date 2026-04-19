import mongoose, { Schema, Document } from "mongoose";

export interface IStudentLog extends Document {
  enrollment: string;
  type: "IN" | "OUT" | "LEAVE";
  timestamp: Date;
  denied: boolean;
  lastedit_timestamp: Date;
  update_count: number;
  mode_of_entry: "SCAN" | "MANUAL";
}

const StudentLogSchema: Schema = new Schema(
  {
    enrollment: { type: String, required: true, ref: "Student" },
    type: { type: String, enum: ["IN", "OUT", "LEAVE"], required: true },
    timestamp: { type: Date, default: Date.now },
    denied: { type: Boolean, default: false },
    lastedit_timestamp: { type: Date, default: Date.now },
    update_count: { type: Number, default: 0 },
    mode_of_entry: { type: String, enum: ["SCAN", "MANUAL"], default: "SCAN" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

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
