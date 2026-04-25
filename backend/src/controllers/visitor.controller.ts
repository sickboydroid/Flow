/**
 * Visitor controller.
 *
 * Tracks people who walk into the building. Unlike students/vehicles,
 * a visitor record is "open" until the operator marks them as left.
 *
 * Endpoints (all under /api/visitor):
 *   GET  /logs               — paginated visitor table for the Visitors tab
 *   POST /log                — create a new visitor entry
 *   PUT  /log/:id/leave      — flip `has_left=true` and stamp `time_out`
 */

import type { Request, Response } from "express";
import { VisitorLog } from "../models/visitorLog.model.js";
import { Metadata } from "../models/metadata.model.js";
import { queryNGrams } from "../utils/ngram.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type StatusFilter = "in" | "out" | "all";
type DateBucket = "today" | "yesterday" | "week" | "month" | "";

/**
 * GET /api/visitor/logs
 *
 * Paginated list of visitor records. Supports fuzzy text search,
 * an in/out/all status filter, date-bucket filter, and timestamp cursor.
 */
export const listVisitorLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = clampLimit(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const status = (req.query.status as StatusFilter) ?? "in";
    const date = ((req.query.date as DateBucket) ?? "") as DateBucket;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

    const query: Record<string, unknown> = {};

    if (status === "in") query.has_left = false;
    else if (status === "out") query.has_left = true;

    const dateRange = buildDateRange(date);
    if (dateRange) query.timestamp = dateRange;

    if (search) {
      const terms = queryNGrams(search);
      const regex = new RegExp(search.split("").join(".*?"), "i");
      const orConditions: Record<string, unknown>[] = [];
      if (terms.length > 0) orConditions.push({ search_ngrams: { $in: terms } });
      orConditions.push(
        { first_name: { $regex: regex } },
        { last_name: { $regex: regex } },
        { address: { $regex: regex } }
      );
      query.$or = orConditions;
    }

    if (cursor && !Number.isNaN(cursor.getTime())) {
      const existingTs = (query.timestamp as Record<string, Date> | undefined) ?? {};
      query.timestamp = { ...existingTs, $lt: cursor };
    }

    const [logs, totalCount] = await Promise.all([
      VisitorLog.find(query).sort({ timestamp: -1 }).limit(limit),
      VisitorLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const nextCursor = logs.length > 0 ? logs[logs.length - 1].timestamp : null;

    res.status(200).json({ logs, nextCursor, totalCount, totalPages });
  } catch (error) {
    console.error("[Visitor] listVisitorLogs failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Backwards-compatible alias used by the route file.
export const getVisitors = listVisitorLogs;

/**
 * POST /api/visitor/log
 *
 * Creates a new visitor record. Names are required; everything else
 * is optional. If a department is supplied it's also recorded in the
 * Metadata collection so it surfaces as a hint next time.
 */
export const addVisitorLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, address, department, remarks } = req.body as {
      first_name?: string;
      last_name?: string;
      address?: string;
      department?: string;
      remarks?: string;
    };
    if (!first_name || !last_name) {
      res.status(400).json({ error: "First and last name are required" });
      return;
    }

    const log = await VisitorLog.create({
      first_name,
      last_name,
      address,
      department,
      remarks,
    });

    if (department) {
      await Metadata.updateOne(
        { type: "visitor_department", key: department },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }

    res.status(200).json({ log });
  } catch (err) {
    console.error("[Visitor] addVisitorLog failed", err);
    res.status(500).json({ error: "Failed to add visitor" });
  }
};

/**
 * PUT /api/visitor/log/:id/leave
 *
 * Marks a visitor as having left the premises and stamps `time_out` to
 * the current time. Idempotent: calling it on an already-left visitor
 * just updates `time_out` again.
 */
export const markVisitorAsLeft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const log = await VisitorLog.findById(id);
    if (!log) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    log.has_left = true;
    log.time_out = new Date();
    await log.save();
    res.status(200).json({ log });
  } catch (err) {
    console.error("[Visitor] markVisitorAsLeft failed", err);
    res.status(500).json({ error: "Failed to update visitor" });
  }
};

// Backwards-compatible alias used by the route file.
export const markVisitorLeft = markVisitorAsLeft;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a `{ $gte, $lt? }` range for the requested date bucket, or null. */
function buildDateRange(bucket: DateBucket): Record<string, Date> | null {
  if (!bucket) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (bucket) {
    case "today":
      return { $gte: startOfToday };
    case "yesterday": {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      return { $gte: startOfYesterday, $lt: startOfToday };
    }
    case "week": {
      const startOfWeek = new Date(
        startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000
      );
      return { $gte: startOfWeek };
    }
    case "month":
      return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    default:
      return null;
  }
}

function clampLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
