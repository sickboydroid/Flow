import { Router } from "express";
import { checkValid, getLogs } from "../controllers/api.controller.js";
import studentRoutes from "./student.routes.js";

const router = Router();

// Global API routes
router.get("/valid", checkValid);
router.get("/logs", getLogs);

// Mount student routes
router.use("/student", studentRoutes);

export default router;
