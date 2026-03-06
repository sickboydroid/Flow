import app from "./app.js";
import { connectDB } from "./config/db.config.js";
import { env } from "./config/env.config.js";

const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(env.port, () => {
    console.debug(
      `[Server] Running in ${env.nodeEnv} mode on http://localhost:${env.port}`,
    );
  });
};

startServer();
