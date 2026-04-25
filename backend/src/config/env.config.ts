/**
 * Environment configuration.
 *
 * Reads the values we care about from `.env` once at import time.
 * Each field is asserted non-null with `!`; if any of these is missing
 * the app will crash early with a clear error rather than silently
 * misbehave at runtime.
 */

import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  /** HTTP listen port. */
  port: string;
  /** Mongo connection URI (e.g. mongodb://localhost:27017/flow). */
  mongoUri: string;
  /** "development" | "production" — also drives logger verbosity. */
  nodeEnv: string;
}

export const env: EnvConfig = {
  port: process.env.PORT!,
  mongoUri: process.env.MONGODB_URI!,
  nodeEnv: process.env.NODE_ENV!,
};
