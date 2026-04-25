/**
 * Metadata controller.
 *
 * The Metadata collection stores reusable suggestion lists that power the
 * "type-ahead" hints in the AddEntry forms. Each row has a `type` (the
 * category, e.g. "vehicle_type") and a `count` (how many times it was
 * picked) — the most popular keys bubble up first.
 *
 * Endpoint:
 *   GET /api/hints?type=<category>&limit=5
 */

import { Request, Response } from "express";
import { Metadata } from "../models/metadata.model.js";

const DEFAULT_HINT_LIMIT = 5;
const MAX_HINT_LIMIT = 25;

/**
 * Returns up to `limit` hint keys for a given metadata type, ordered by
 * usage count descending. The frontend treats the response as a flat
 * `string[]` of suggestions.
 */
export const getHints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    if (!type || typeof type !== "string") {
      res.status(400).json({ error: "Query param 'type' is required" });
      return;
    }

    const limit = clampLimit(req.query.limit);
    const hints = await Metadata.find({ type }).sort({ count: -1 }).limit(limit);

    res.status(200).json({ hints: hints.map((h) => h.key) });
  } catch (e) {
    console.error("[Metadata] getHints failed", e);
    res.status(500).json({ error: "Failed to load hints" });
  }
};

function clampLimit(raw: unknown): number {
  const parsed = parseInt(String(raw ?? DEFAULT_HINT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_HINT_LIMIT;
  return Math.min(parsed, MAX_HINT_LIMIT);
}
