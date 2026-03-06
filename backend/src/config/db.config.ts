import mongoose from "mongoose";
import { env } from "./env.config.js";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.debug(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(
      `[Database Error] ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    // Exit process with failure if the database cannot connect
    process.exit(1);
  }
};
