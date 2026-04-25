/**
 * Visitor domain routes.
 *
 * Mounted at /api/visitor. Handlers live in `visitor.controller.ts`.
 */

import { Router } from "express";
import {
  listVisitorLogs,
  addVisitorLog,
  markVisitorAsLeft,
} from "../controllers/visitor.controller.js";

const router = Router();

router.get("/logs", listVisitorLogs);
router.post("/log", addVisitorLog);
router.put("/log/:id/leave", markVisitorAsLeft);

export default router;
