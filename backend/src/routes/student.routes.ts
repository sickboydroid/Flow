import { Router, Request, Response, NextFunction } from "express";
import { getInfo, getLogs, getStatus, updateStatus, updateLog } from "../controllers/student.controller.js";

const router = Router();

// Middleware to ensure enroll query param is present
router.use((req: Request, res: Response, next: NextFunction): void => {
  if (!req.query.enroll) {
    res.status(400).json({ error: "Missing enroll query parameter" });
    return;
  }
  next();
});

router.get("/info", getInfo);
router.get("/logs", getLogs);
router.get("/status", getStatus);
router.post("/update/status", updateStatus);
router.put("/update/log", updateLog);

export default router;
