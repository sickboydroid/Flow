/**
 * Student domain routes.
 *
 * Mounted at /api/student by the top-level router. Each handler lives
 * in `student.controller.ts` and is documented there.
 */

import { Router } from "express";
import {
  getInfo,
  getLogs,
  listStudentsWithStatus,
  getStudentStats,
  getStatus,
  updateStatus,
  updateLog,
  addManualLog,
  checkValid,
} from "../controllers/student.controller.js";

const router = Router();

// --- Reads ------------------------------------------------------------------
router.get("/valid", checkValid);
router.get("/info", getInfo);
router.get("/logs", getLogs);
router.get("/all", listStudentsWithStatus);
router.get("/stats", getStudentStats);
router.get("/status", getStatus);

// --- Writes -----------------------------------------------------------------
router.post("/update/status", updateStatus);
router.put("/update/log", updateLog);
router.post("/log/manual", addManualLog);

export default router;
