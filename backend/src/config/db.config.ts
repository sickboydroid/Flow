/**
 * Mongo connection helper.
 *
 * Establishes a single shared mongoose connection on boot. We bail out
 * with `process.exit(1)` on failure so a misconfigured environment is
 * obvious in the logs instead of silently degrading every request.
 */

import mongoose from "mongoose";
import { env } from "./env.config.js";
import { logger } from "../utils/logger.js";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    logger.info(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(
      `[Database Error] ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
};
