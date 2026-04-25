/**
 * Student controller.
 *
 * Exposes everything the frontend needs to look at and mutate students
 * and their entry/exit logs. Most handlers expect the student to be
 * identified via the `enroll` query parameter (the public enrollment
 * code printed on the ID card).
 *
 * Endpoints (all under /api/student):
 *
 *   GET  /valid?rfid=…|enroll=…   – is this card / id one we know?
 *   GET  /info?enroll=…           – full profile document
 *   GET  /logs?enroll=…           – paginated history of one student
 *   GET  /all                     – paginated table of every student
 *                                   plus their latest log (the Students tab)
 *   GET  /stats?enroll=…          – per-status counts and durations
 *   GET  /status?enroll=…         – just the latest IN/OUT/LEAVE
 *
 *   POST /update/status?enroll=…  – auto-toggle (used by the RFID scan)
 *   PUT  /update/log?enroll=…     – soft-delete or edit one log
 *   POST /log/manual?enroll=…     – record a manual entry/exit
 */

import type { Request, Response } from "express";
import type { PipelineStage } from "mongoose";
import { Student } from "../models/student.model.js";
import { StudentLog, type IStudentLog } from "../models/studentLog.model.js";
import { queryNGrams } from "../utils/ngram.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_HISTORY_PAGE_SIZE = 20;
const MAX_HISTORY_PAGE_SIZE = 100;

type StudentLogType = IStudentLog["type"]; // "IN" | "OUT" | "LEAVE"

const getEnroll = (req: Request): string => String(req.query.enroll ?? "");

// ---------------------------------------------------------------------------
// Read endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/student/valid
 *
 * Lookup helper for the RFID flow. Returns `{ valid: true, enrollment }`
 * if the card / enrollment matches a student, or `{ valid: false }` (404)
 * if not.
 */
export const checkValid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rfid, enroll } = req.query;
    if (!rfid && !enroll) {
      res.status(400).json({ error: "Provide either rfid or enroll" });
      return;
    }

    const student = rfid
      ? await Student.findOne({ rfid: String(rfid) })
      : await Student.findOne({ enrollment: String(enroll) });

    if (!student) {
      res.status(404).json({ valid: false });
      return;
    }
    res.status(200).json({ valid: true, enrollment: student.enrollment });
  } catch (error) {
    console.error("[Student] checkValid failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/** GET /api/student/info — returns the full profile document. */
export const getInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const student = await Student.findOne({ enrollment: enroll });
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.status(200).json({ student });
  } catch (error) {
    console.error("[Student] getInfo failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/student/logs
 *
 * Cursor-paginated history of a single student's entry/exit logs.
 * `cursor` is the timestamp of the oldest item the client already has;
 * the next page returns items strictly older than that cursor.
 *
 * Optional `after` lets the caller cap how far back to look (used by
 * the dashboard's "last hour" view).
 */
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const limit = clampLimit(req.query.limit, DEFAULT_HISTORY_PAGE_SIZE, MAX_HISTORY_PAGE_SIZE);

    const query: Record<string, unknown> = { deleted: false };
    if (enroll) query.enrollment = enroll;

    const range: Record<string, Date> = {};
    if (req.query.cursor) range.$lt = new Date(String(req.query.cursor));
    if (req.query.after) range.$gte = new Date(String(req.query.after));
    if (Object.keys(range).length > 0) query.timestamp = range;

    const logs = await StudentLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("student");

    const totalCount = await StudentLog.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    const nextCursor = logs.length > 0 ? logs[logs.length - 1].timestamp : null;

    res.status(200).json({ logs, nextCursor, totalCount, totalPages });
  } catch (error) {
    console.error("[Student] getLogs failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/student/all
 *
 * Backs the Students tab. Returns one row per student joined with that
 * student's most recent log so the table can show their current status.
 *
 * Supports fuzzy search (n-grams + regex), gender / role / status
 * filters, and offset-based "cursor" paging (the cursor is just an
 * integer offset).
 */
export const listStudentsWithStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = clampLimit(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const cursor = req.query.cursor ? parseInt(String(req.query.cursor), 10) : 0;
    const offset = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;

    const matchStage = buildStudentMatchStage(req);
    const statusFilter = buildLatestStatusFilter(req);

    const basePipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "studentlogs",
          let: { enroll: "$enrollment" },
          pipeline: [
            { $match: { $expr: { $eq: ["$enrollment", "$$enroll"] }, deleted: false } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "latestLog",
        },
      },
      { $unwind: { path: "$latestLog", preserveNullAndEmptyArrays: true } },
    ];

    if (statusFilter) basePipeline.push(statusFilter);

    basePipeline.push({ $sort: { "latestLog.timestamp": -1, enrollment: 1 } });

    // Page slice
    const pagePipeline: PipelineStage[] = [...basePipeline];
    if (offset > 0) pagePipeline.push({ $skip: offset });
    pagePipeline.push({ $limit: limit });

    // Total count — same filters, no skip/limit
    const countPipeline: PipelineStage[] = [...basePipeline, { $count: "total" }];

    const [rawStudents, countRes] = await Promise.all([
      Student.aggregate(pagePipeline),
      Student.aggregate(countPipeline),
    ]);

    const totalCount = countRes[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);
    const data = rawStudents.map(toStudentTableRow);
    const nextCursor = rawStudents.length === limit ? offset + rawStudents.length : null;

    res.status(200).json({ logs: data, nextCursor, totalCount, totalPages });
  } catch (error) {
    console.error("[Student] listStudentsWithStatus failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Backwards-compatible export name used by the route file.
export const getAllStudentsView = listStudentsWithStatus;

/**
 * GET /api/student/stats
 *
 * Aggregates a student's history into per-status counts and the total
 * time they've spent in each state. Durations are computed by treating
 * each log as the start of an interval that ends at the next log; the
 * final, still-ongoing interval is not counted.
 */
export const getStudentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const allLogs = await StudentLog.find({ enrollment: enroll, deleted: false }).sort({
      timestamp: 1,
    });

    if (allLogs.length === 0) {
      res.status(200).json(emptyStats());
      return;
    }

    const totals = countByType(allLogs);
    const durations = sumDurationsByType(allLogs);

    res.status(200).json({
      totalLogs: allLogs.length,
      totalIn: totals.IN,
      totalOut: totals.OUT,
      totalLeave: totals.LEAVE,
      firstLogDate: allLogs[0].timestamp,
      lastActiveDate: allLogs[allLogs.length - 1].timestamp,
      totalInDuration: durations.IN,
      totalOutDuration: durations.OUT,
      totalLeaveDuration: durations.LEAVE,
    });
  } catch (e) {
    console.error("[Student] getStudentStats failed", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/** GET /api/student/status — convenience: just the latest IN/OUT/LEAVE. */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const lastLog = await StudentLog.findOne({ enrollment: enroll, deleted: false }).sort({
      timestamp: -1,
    });
    res.status(200).json({ status: lastLog ? lastLog.type : "IN" });
  } catch (error) {
    console.error("[Student] getStatus failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ---------------------------------------------------------------------------
// Write endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/student/update/status
 *
 * Auto-toggles the student's state (IN ↔ OUT) and writes a new RFID-mode
 * log. Used by the scanner.
 */
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const lastLog = await StudentLog.findOne({ enrollment: enroll, deleted: false }).sort({
      timestamp: -1,
    });
    const lastStatus: StudentLogType = lastLog ? lastLog.type : "IN";
    const newStatus: StudentLogType = lastStatus === "IN" ? "OUT" : "IN";

    const newLog = await StudentLog.create({
      enrollment: enroll,
      type: newStatus,
      deleted: false,
      timestamp: new Date(),
      mode_of_entry: "RFID",
    });

    res.status(200).json({ log: newLog });
  } catch (error) {
    console.error("[Student] updateStatus failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * PUT /api/student/update/log
 *
 * Mutates a single log row. Body keys: `log_id` (required) plus any of
 * `deleted`, `status`, `remarks`. We use `findOne` + `save` so model
 * pre-save hooks fire.
 */
export const updateLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { log_id, deleted, status, remarks } = req.body as {
      log_id?: string;
      deleted?: boolean;
      status?: StudentLogType;
      remarks?: string;
    };
    if (!log_id) {
      res.status(400).json({ error: "log_id is required" });
      return;
    }

    const logToUpdate = await StudentLog.findOne({ _id: log_id, enrollment: enroll });
    if (!logToUpdate) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (deleted !== undefined) logToUpdate.deleted = deleted;
    if (status) logToUpdate.type = status;
    if (remarks) logToUpdate.remarks = remarks;

    await logToUpdate.save();
    res.status(200).json({ log: logToUpdate });
  } catch (error) {
    console.error("[Student] updateLog failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/** POST /api/student/log/manual — operator-driven entry from the AddEntry dialog. */
export const addManualLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { type, remarks } = req.body as { type?: StudentLogType; remarks?: string };

    const newLog = await StudentLog.create({
      enrollment: enroll,
      type: type ?? "IN",
      deleted: false,
      timestamp: new Date(),
      mode_of_entry: "MANUAL",
      remarks,
    });

    res.status(200).json({ log: newLog });
  } catch (error) {
    console.error("[Student] addManualLog failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds the `$match` stage for the Students tab (search + gender + role). */
function buildStudentMatchStage(req: Request): Record<string, unknown> {
  const stage: Record<string, unknown> = {};
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const genders = typeof req.query.genders === "string" ? req.query.genders : "";
  const roles = typeof req.query.roles === "string" ? req.query.roles : "";

  if (search) {
    const terms = queryNGrams(search);
    const regex = new RegExp(search.split("").join(".*?"), "i");
    const orConditions: Record<string, unknown>[] = [];
    if (terms.length > 0) orConditions.push({ search_ngrams: { $in: terms } });
    orConditions.push(
      { enrollment: { $regex: regex } },
      { firstName: { $regex: regex } },
      { lastName: { $regex: regex } }
    );
    stage.$or = orConditions;
  }

  if (genders) {
    stage.gender = { $in: genders.split(",").map((s) => s.toLowerCase()) };
  }

  if (roles) {
    // roles = "hosteller" | "day_scholar"; 
    if (roles == "hosteller") stage.isHosteller = true;
    else if (roles == "day_scholar") stage.isHosteller = false;
  }

  return stage;
}

/** Builds the `$match` stage that filters on the joined `latestLog.type`. */
function buildLatestStatusFilter(req: Request): PipelineStage | null {
  const statuses = typeof req.query.statuses === "string" ? req.query.statuses : "";
  if (!statuses) return null;
  const arr = statuses.split(",").map((s) => s.toUpperCase());
  return { $match: { "latestLog.type": { $in: arr } } };
}

/** Reshape a Student aggregation row into the table format the frontend wants. */
function toStudentTableRow(student: Record<string, unknown>): Record<string, unknown> {
  const latest = student.latestLog as
    | { _id?: unknown; type?: StudentLogType; timestamp?: Date }
    | undefined;
  return {
    _id: latest?._id ?? null,
    enrollment: student.enrollment,
    status: latest?.type ?? "NO ACTIVITY",
    timestamp: latest?.timestamp ?? null,
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      enrollment: student.enrollment,
      gender: student.gender,
      branch: student.branch,
      picUrl: student.picUrl,
      address: student.address,
      isHosteller: student.isHosteller,
      phoneNumber: student.phoneNumber,
    },
  };
}

interface PerTypeNumber {
  IN: number;
  OUT: number;
  LEAVE: number;
}

function emptyStats(): Record<string, unknown> {
  return {
    totalLogs: 0,
    totalIn: 0,
    totalOut: 0,
    totalLeave: 0,
    firstLogDate: null,
    lastActiveDate: null,
    totalInDuration: 0,
    totalOutDuration: 0,
    totalLeaveDuration: 0,
  };
}

function countByType(logs: IStudentLog[]): PerTypeNumber {
  const counts: PerTypeNumber = { IN: 0, OUT: 0, LEAVE: 0 };
  for (const l of logs) counts[l.type]++;
  return counts;
}

/**
 * Treats consecutive logs as the start/end of an interval and accumulates
 * the millisecond duration into the bucket of the *starting* log's type.
 */
function sumDurationsByType(logs: IStudentLog[]): PerTypeNumber {
  const totals: PerTypeNumber = { IN: 0, OUT: 0, LEAVE: 0 };
  for (let i = 0; i < logs.length - 1; i++) {
    const curr = logs[i];
    const next = logs[i + 1];
    const ms = new Date(next.timestamp).getTime() - new Date(curr.timestamp).getTime();
    if (ms > 0) totals[curr.type] += ms;
  }
  return totals;
}

function clampLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
