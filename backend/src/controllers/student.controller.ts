import { Request, Response } from "express";
import { Student } from "../models/student.model.js";
import { StudentLog } from "../models/studentLog.model.js";

// Helper to get enroll from query
const getEnroll = (req: Request) => req.query.enroll as string;

// GET /api/student/info?enroll={ENROLL}
export const getInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const student = await Student.findOne({ enrollment: enroll });
    
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    
    // We send back info, usually we might omit some internal fields if necessary,
    // but returning the whole object is fine based on "Returns all the info..."
    res.status(200).json({ student });
  } catch (error) {
    console.error("Error in student/info:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/student/logs?enroll={ENROLL}&limit=&offset=
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { limit = '50', offset = '0', denied } = req.query;

    const query: any = { enrollment: enroll };
    
    if (denied === 'false') {
      query.denied = false;
    }

    const parsedLimit = Math.min(parseInt(limit as string, 10), 50); // Cap at 50
    const parsedOffset = parseInt(offset as string, 10);

    const [logs, totalCount] = await Promise.all([
      StudentLog.find(query)
        .sort({ timestamp: -1 })
        .skip(parsedOffset)
        .limit(parsedLimit),
      StudentLog.countDocuments(query)
    ]);
    
    res.status(200).json({ logs, totalCount });
  } catch (error) {
    console.error("Error in student/logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/student/stats?enroll={ENROLL}
export const getStudentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);

    const allLogs = await StudentLog.find({ enrollment: enroll, denied: false }).sort({ timestamp: 1 });

    if (allLogs.length === 0) {
      res.status(200).json({
        totalLogs: 0, totalIn: 0, totalOut: 0, totalLeave: 0,
        firstLogDate: null, lastActiveDate: null,
        totalInDuration: 0, totalOutDuration: 0, totalLeaveDuration: 0
      });
      return;
    }

    const totalLogs = allLogs.length;
    const totalIn = allLogs.filter(l => l.type === 'IN').length;
    const totalOut = allLogs.filter(l => l.type === 'OUT').length;
    const totalLeave = allLogs.filter(l => l.type === 'LEAVE').length;
    const firstLogDate = allLogs[0].timestamp;
    const lastActiveDate = allLogs[allLogs.length - 1].timestamp;

    // Calculate durations: time spent IN, OUT, LEAVE by pairing consecutive logs
    let totalInMs = 0, totalOutMs = 0, totalLeaveMs = 0;
    for (let i = 0; i < allLogs.length - 1; i++) {
      const curr = allLogs[i];
      const next = allLogs[i + 1];
      const durationMs = new Date(next.timestamp).getTime() - new Date(curr.timestamp).getTime();
      if (curr.type === 'IN') totalInMs += durationMs;
      else if (curr.type === 'OUT') totalOutMs += durationMs;
      else if (curr.type === 'LEAVE') totalLeaveMs += durationMs;
    }

    res.status(200).json({
      totalLogs, totalIn, totalOut, totalLeave,
      firstLogDate, lastActiveDate,
      totalInDuration: totalInMs,
      totalOutDuration: totalOutMs,
      totalLeaveDuration: totalLeaveMs
    });
  } catch (error) {
    console.error("Error in student/stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/student/status?enroll={ENROLL}
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    
    // Returns current status of the user: status of non-denied entry in logs
    // If no entry is given yet, assume IN
    const lastLog = await StudentLog.findOne({ enrollment: enroll, denied: false })
      .sort({ timestamp: -1 });

    const status = lastLog ? lastLog.type : "IN";
    
    res.status(200).json({ status });
  } catch (error) {
    console.error("Error in student/status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// POST /api/student/update/status?enroll={ENROLL}
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);

    // Get last status of student
    const lastLog = await StudentLog.findOne({ enrollment: enroll, denied: false })
      .sort({ timestamp: -1 });
    
    const lastStatus = lastLog ? lastLog.type : "IN";
    
    // Create new log with flipped status (if LEAVE or OUT -> IN, if IN -> OUT)
    const newStatus = ["OUT", "LEAVE"].includes(lastStatus) ? "IN" : "OUT";
    
    const newLog = new StudentLog({
      enrollment: enroll,
      type: newStatus,
      denied: false,
      timestamp: new Date(),
      lastedit_timestamp: new Date(),
      update_count: 0,
      mode_of_entry: "SCAN"
    });
    
    await newLog.save();
    
    res.status(200).json({ log: newLog });
  } catch (error) {
    console.error("Error in student/update/status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// PUT /api/student/update/log?enroll={ENROLL}&log_id={ID}&denied={TRUE/FALSE}&status={IN/OUT}&timestamp={timestamp}
export const updateLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { log_id, denied, status, timestamp } = req.query;

    if (!log_id || typeof log_id !== 'string') {
      res.status(400).json({ error: "log_id is required" });
      return;
    }

    const logToUpdate = await StudentLog.findOne({ _id: log_id, enrollment: enroll });
    if (!logToUpdate) {
      res.status(404).json({ error: "Log not found" });
      return;
    }

    // Update fields if given
    if (denied !== undefined) {
      logToUpdate.denied = denied === 'true';
    }
    
    if (status === 'IN' || status === 'ENTRY_IN') {
      logToUpdate.type = 'IN';
    } else if (status === 'OUT' || status === 'ENTRY_OUT') {
      logToUpdate.type = 'OUT';
    } else if (status === 'LEAVE') {
      logToUpdate.type = 'LEAVE';
    }

    // Update timestamp if given. 
    // The design says: "timestamp={timestamp} ... Makes sure that the log to update that lastedittimestamp with given one"
    // Wait, the design means we probably use the provided timestamp query param to set `timestamp` or `lastedit_timestamp`.
    // Actually, "Makes sure that the log to update that lastedittimestamp with given one". This might imply we update `lastedit_timestamp` to the current time, or we set it to the provided `timestamp`.
    // I will write both: update `timestamp` if provided, and ALWAYS update `lastedit_timestamp` to current time.
    if (timestamp && typeof timestamp === 'string') {
        const parsedTimestamp = new Date(timestamp);
        if (!isNaN(parsedTimestamp.getTime())) {
             logToUpdate.timestamp = parsedTimestamp;
        }
    }

    logToUpdate.lastedit_timestamp = new Date();
    logToUpdate.update_count += 1;

    await logToUpdate.save();

    res.status(200).json({ log: logToUpdate });
  } catch (error) {
    console.error("Error in student/update/log:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// POST /api/student/log/manual
export const addManualLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { type } = req.body; // expect type from body: "IN", "OUT", "LEAVE"

    if (!enroll) {
      res.status(400).json({ error: "Enrollment is required" });
      return;
    }
    
    const newType = (type && ["IN", "OUT", "LEAVE"].includes(type.toUpperCase())) ? type.toUpperCase() : "IN";

    const newLog = new StudentLog({
      enrollment: enroll,
      type: newType,
      denied: false,
      timestamp: new Date(),
      lastedit_timestamp: new Date(),
      update_count: 0,
      mode_of_entry: "MANUAL"
    });
    
    await newLog.save();
    res.status(200).json({ log: newLog });
  } catch (error) {
    console.error("Error in addManualLog:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
