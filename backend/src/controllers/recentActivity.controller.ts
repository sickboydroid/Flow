/**
 * Recent Activity controller.
 *
 * Powers the dashboard's "Recent Logs" feed — a single, time-sorted stream
 * that mixes student / vehicle / visitor logs. The frontend uses this feed
 * to give the operator a unified live view of the gate.
 *
 * Endpoint:
 *   GET /api/recent-logs?limit=20
 */

import { Request, Response } from "express";
import { StudentLog } from "../models/studentLog.model.js";
import { VehicleLog } from "../models/vehicleLog.model.js";
import { VisitorLog } from "../models/visitorLog.model.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type RecentLogKind = "student" | "vehicle" | "visitor";

interface MixedLog {
  timestamp?: Date | string | null;
  logType: RecentLogKind;
  [key: string]: unknown;
}

/**
 * Returns the most recent `limit` events across all three domains, sorted
 * newest-first. Each item is tagged with `logType` so the client can pick
 * the right renderer.
 */
export const listRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = clampLimit(req.query.limit);
    const [studentLogs, vehicleLogs, visitorLogs] = await getRecentLogs(limit);

    // in case you only want unique logs of each type (like each student has only the latest log in recent logs)
    // const [studentLogs, vehicleLogs, visitorLogs] = await getRecentLogsRecent(limit);

    const mixed: MixedLog[] = [
      ...studentLogs.map((l) => ({ ...l, logType: "student" as const })),
      ...vehicleLogs.map((l) => ({ ...l, logType: "vehicle" as const })),
      ...visitorLogs.map((l) => ({ ...l, logType: "visitor" as const })),
    ];

    mixed.sort(byTimestampDesc);

    res.status(200).json({ logs: mixed.slice(0, limit) });
  } catch (e) {
    console.error("[RecentActivity] listRecentActivity failed", e);
    res.status(500).json({ error: "Failed to load recent activity" });
  }
};

/**
 * Returns recent limit logs from all three categories
 */
async function getRecentLogs(limit: number) {
  // Each domain is queried for its newest `limit` events; we then merge
  // and slice. This keeps the work O(limit) per collection rather than
  // pulling whole tables and sorting in memory.
  return Promise.all([
    StudentLog.find({ deleted: false })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("student")
      .lean(),
    VehicleLog.find().sort({ timestamp: -1 }).limit(limit).lean(),
    VisitorLog.find().sort({ timestamp: -1 }).limit(limit).lean(),
  ]);
}


/**
 * Same as getRecentLogs(...), however only returns unique students and vehicles from each category
 * For example if a student has logged multiple times, it will only show its latest log in the recent logs
 */
async function getRecentLogsRecent(limit: number) {
  // Each domain is queried for its newest `limit` events; we then merge
  // and slice. This keeps the work O(limit) per collection rather than
  // pulling whole tables and sorting in memory.
  return Promise.all([
    StudentLog.aggregate([
      { $match: { deleted: false } },
      { $sort: { timestamp: -1 } },   // latest first per student
      {
        $group: {
          _id: "$enrollment",
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $limit: limit },
      // populate
      {
        $lookup: {
          from: "students",              // collection name
          localField: "enrollment",
          foreignField: "enrollment",
          as: "student"
        }
      },
      { $unwind: "$student" }
    ]),
    VehicleLog.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$plate",
          doc: { $first: "$$ROOT" }           // pick latest per plate
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $limit: limit }
    ]),
    VisitorLog.find().sort({ timestamp: -1 }).limit(limit).lean(),
  ]);
}

function clampLimit(raw: unknown): number {
  const parsed = parseInt(String(raw ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function byTimestampDesc(a: MixedLog, b: MixedLog): number {
  const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
  const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
  return tb - ta;
}
