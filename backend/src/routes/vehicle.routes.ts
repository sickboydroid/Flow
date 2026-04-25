/**
 * Vehicle domain routes.
 *
 * Mounted at /api/vehicle. Handlers live in `vehicle.controller.ts`.
 */

import { Router } from "express";
import {
  listLatestVehicleLogs,
  getVehicleHistory,
  addVehicleLog,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.get("/logs", listLatestVehicleLogs);
router.get("/history", getVehicleHistory);
router.post("/log", addVehicleLog);

export default router;
