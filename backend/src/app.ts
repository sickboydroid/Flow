import express, { Application, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/api.routes.js";

const app: Application = express();

// --- Middlewares ---
// Enable CORS for vite frontend
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());
// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));


// --- Static files ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/profilepics", express.static(path.join(__dirname, "../public/profilepics")));

// --- API Routes---
app.use("/api", apiRoutes);

// --- 404 Fallback ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

export default app;
