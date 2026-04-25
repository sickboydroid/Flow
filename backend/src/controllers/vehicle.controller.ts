/**
 * Vehicle controller.
 *
 * Handles the Vehicles tab and the per-plate history dialog.
 *
 * Endpoints (all under /api/vehicle):
 *   GET  /logs    — paginated table grouped by latest log per plate
 *   GET  /history — full history for one plate (used by the dialog)
 *   POST /log     — record a new IN / OUT event for a plate
 */

import type { Request, Response } from "express";
import type { PipelineStage } from "mongoose";
import { VehicleLog } from "../models/vehicleLog.model.js";
import { Metadata } from "../models/metadata.model.js";
import { queryNGrams } from "../utils/ngram.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_HISTORY_PAGE_SIZE = 50;
const MAX_HISTORY_PAGE_SIZE = 200;

type Direction = "IN" | "OUT";

/**
 * GET /api/vehicle/logs
 *
 * Returns one row per plate (the most recent log) so the table doesn't
 * show the same vehicle twice. Supports fuzzy search, an IN/OUT/all
 * status filter, and timestamp-cursor pagination.
 */
export const listLatestVehicleLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = clampLimit(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

    const matchStage = buildVehicleMatchStage(search, cursor);

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $sort: { timestamp: -1 } },
      // Collapse to one row per plate, keeping the newest log
      { $group: { _id: "$plate", latestLog: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestLog" } },
    ];

    if (status && status !== "all") {
      pipeline.push({ $match: { type: status.toUpperCase() } });
    }

    pipeline.push({ $sort: { timestamp: -1 } }, { $limit: limit });

    const logs = await VehicleLog.aggregate(pipeline);

    // Recompute the count *before* the page slice (skip + limit)
    const countPipeline: PipelineStage[] = pipeline.slice(0, pipeline.length - 2);
    countPipeline.push({ $count: "total" });
    const countRes = await VehicleLog.aggregate(countPipeline);
    const totalCount = countRes[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);
    const nextCursor = logs.length > 0 ? logs[logs.length - 1].timestamp : null;

    res.status(200).json({ logs, nextCursor, totalCount, totalPages });
  } catch (error) {
    console.error("[Vehicle] listLatestVehicleLogs failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Backwards-compatible alias used by the route file.
export const getVehicles = listLatestVehicleLogs;

/**
 * GET /api/vehicle/history
 *
 * Full chronological history for one plate. Used by the dialog where
 * we want to show every IN/OUT event that vehicle ever had.
 */
export const getVehicleHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const plate = typeof req.query.plate === "string" ? req.query.plate.trim() : "";
    if (!plate) {
      res.status(400).json({ error: "Plate is required" });
      return;
    }
    const limit = clampLimit(req.query.limit, DEFAULT_HISTORY_PAGE_SIZE, MAX_HISTORY_PAGE_SIZE);
    const offset = parseInt(String(req.query.offset ?? 0), 10) || 0;

    const [logs, totalCount] = await Promise.all([
      VehicleLog.find({ plate: plate.toUpperCase() })
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit),
      VehicleLog.countDocuments({ plate: plate.toUpperCase() }),
    ]);

    res.status(200).json({ logs, totalCount });
  } catch (error) {
    console.error("[Vehicle] getVehicleHistory failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * POST /api/vehicle/log
 *
 * Records a new IN / OUT event. Bumps the per-`type_of_vehicle` count in
 * the Metadata collection so it shows up as a hint in the AddEntry form.
 */
export const addVehicleLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plate, type_of_vehicle, type, remarks } = req.body as {
      plate?: string;
      type_of_vehicle?: string;
      type?: Direction;
      remarks?: string;
    };
    if (!plate || !type_of_vehicle || !type) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const log = await VehicleLog.create({
      plate: plate.toUpperCase(),
      type_of_vehicle,
      type,
      remarks,
    });

    await Metadata.updateOne(
      { type: "vehicle_type", key: type_of_vehicle },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    res.status(200).json({ log });
  } catch (err) {
    console.error("[Vehicle] addVehicleLog failed", err);
    res.status(500).json({ error: "Failed to add vehicle log" });
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildVehicleMatchStage(search: string, cursor: Date | null): Record<string, unknown> {
  const stage: Record<string, unknown> = {};

  if (search) {
    const terms = queryNGrams(search);
    const regex = new RegExp(search.split("").join(".*?"), "i");
    const orConditions: Record<string, unknown>[] = [];
    if (terms.length > 0) orConditions.push({ search_ngrams: { $in: terms } });
    orConditions.push(
      { plate: { $regex: regex } },
      { type_of_vehicle: { $regex: regex } },
      { remarks: { $regex: regex } }
    );
    stage.$or = orConditions;
  }

  if (cursor && !Number.isNaN(cursor.getTime())) {
    stage.timestamp = { $lt: cursor };
  }

  return stage;
}

function clampLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
