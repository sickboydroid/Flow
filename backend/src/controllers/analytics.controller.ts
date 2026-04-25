/**
 * Analytics controller.
 *
 * Powers the dashboard's overview tiles. Today the only endpoint is a
 * coarse count of records per collection — cheap to compute via the
 * Mongo `countDocuments` API. Add aggregations here when richer reports
 * are needed.
 *
 * Endpoint:
 *   GET /api/analytics
 */

import { Request, Response } from "express";
import { Student } from "../models/student.model.js";
import { StudentLog } from "../models/studentLog.model.js";
import { VehicleLog } from "../models/vehicleLog.model.js";
import { VisitorLog } from "../models/visitorLog.model.js";

interface OverviewTotals {
  students: number;
  studentLogs: number;
  vehicleLogs: number;
  visitorLogs: number;
  totalLogs: number;
}

/**
 * Returns the high-level totals shown on the analytics tab.
 *
 * `studentLogs` excludes soft-deleted rows; vehicle and visitor logs are
 * never soft-deleted today so the raw count is correct for them.
 */
export const getOverviewTotals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [students, studentLogs, vehicleLogs, visitorLogs] = await Promise.all([
      Student.countDocuments(),
      StudentLog.countDocuments({ deleted: false }),
      VehicleLog.countDocuments(),
      VisitorLog.countDocuments(),
    ]);

    const totals: OverviewTotals = {
      students,
      studentLogs,
      vehicleLogs,
      visitorLogs,
      totalLogs: studentLogs + vehicleLogs + visitorLogs,
    };

    res.status(200).json({ totals });
  } catch (e) {
    console.error("[Analytics] getOverviewTotals failed", e);
    res.status(500).json({ error: "Failed to load analytics" });
  }
};
