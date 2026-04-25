/**
 * Top-level API router.
 *
 * Routes are grouped by concern:
 *   - Cross-domain reads (hints, analytics, recent activity) sit at the root.
 *   - Each domain (student, vehicle, visitor) is mounted under its prefix
 *     and owns its own router file.
 */

import { Router } from "express";
import { getHints } from "../controllers/metadata.controller.js";
import { getOverviewTotals } from "../controllers/analytics.controller.js";
import { listRecentActivity } from "../controllers/recentActivity.controller.js";
import studentRoutes from "./student.routes.js";
import vehicleRoutes from "./vehicle.routes.js";
import visitorRoutes from "./visitor.routes.js";

const router = Router();

// Cross-domain reads
router.get("/hints", getHints);
router.get("/analytics", getOverviewTotals);
router.get("/recent-logs", listRecentActivity);

// Per-domain mounts
router.use("/student", studentRoutes);
router.use("/vehicle", vehicleRoutes);
router.use("/visitor", visitorRoutes);

export default router;
