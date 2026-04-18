import mongoose, { Schema, Document } from "mongoose";

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
  },
  { timestamps: true },
);

export const Student = mongoose.model<IStudent>("Student", StudentSchema);
