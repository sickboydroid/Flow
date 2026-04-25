/**
 * Application logger.
 *
 * Writes to two transports:
 *   1. Console — colored, ISO timestamps, used during dev.
 *   2. Daily-rotated file at `logs/application-YYYY-MM-DD-HH.log`,
 *      capped at 20MB per file and 14 days of history.
 *
 * In `NODE_ENV=development` we emit `debug` and above; otherwise `info`.
 */

import winston from "winston";
import "winston-daily-rotate-file";

const { combine, timestamp, printf, colorize } = winston.format;

const lineFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    lineFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        lineFormat
      ),
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});
