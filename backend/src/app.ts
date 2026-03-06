import express, { Application, Request, Response } from "express";
import cors from "cors";

const app: Application = express();

// --- Middlewares ---
// Enable CORS for vite frontend
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());
// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// --- API Routes---

// --- 404 Fallback ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

export default app;
