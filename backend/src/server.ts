/**
 * Application entrypoint.
 *
 * Boots the database connection first (so we fail fast if Mongo is down)
 * and only then starts the HTTP listener.
 */

import app from "./app.js";
import { connectDB } from "./config/db.config.js";
import { env } from "./config/env.config.js";
import { logger } from "./utils/logger.js";

const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(env.port, () => {
    logger.info(
      `[Server] Running in ${env.nodeEnv} mode on http://localhost:${env.port}`
    );
  });
};

startServer().catch((err) => {
  logger.error("[Server] Failed to start", { error: (err as Error).message });
  process.exit(1);
});
