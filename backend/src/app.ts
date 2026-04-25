/**
 * Express application factory.
 *
 * Wires up middleware, the API router, the static profile-picture mount,
 * and the global error / 404 fallbacks. The HTTP listener itself lives
 * in `server.ts` so this module stays test-friendly (no side effects).
 */

import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/api.routes.js";
import { logger } from "./utils/logger.js";

const app: Application = express();

// --- Request logging --------------------------------------------------------
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

// --- Standard middleware ----------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static assets ----------------------------------------------------------
// Profile pictures are served straight from disk under /profilepics/<file>
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/profilepics", express.static(path.join(__dirname, "../public/profilepics")));

// --- API routes -------------------------------------------------------------
app.use("/api", apiRoutes);

// --- Centralized error handler ---------------------------------------------
// Express recognizes a 4-arg middleware as the error handler. The unused
// `next` param is required by Express; renaming to `_next` silences linters.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error on ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal Error" });
});

// --- 404 fallback -----------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

export default app;
