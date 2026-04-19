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

// GET /api/student/logs?enroll={ENROLL}
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const enroll = getEnroll(req);
    const { limit = '100', offset = '0', after, before, denied = 'false' } = req.query;

    const query: any = { enrollment: enroll };
    
    if (denied === 'false') {
      query.denied = false;
    }

    if (after || before) {
        query.timestamp = {};
        if (after) query.timestamp.$gte = new Date(after as string);
        if (before) query.timestamp.$lte = new Date(before as string);
    }

    const logs = await StudentLog.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset as string, 10))
      .limit(parseInt(limit as string, 10))
      .populate("student");
    
    res.status(200).json({ logs });
  } catch (error) {
    console.error("Error in student/logs:", error);
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

    const status = lastLog ? lastLog.type : "ENTRY_IN";
    
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
    
    const lastStatus = lastLog ? lastLog.type : "ENTRY_IN";
    
    // Create new log with flipped status
    const newStatus = lastStatus === "ENTRY_IN" ? "ENTRY_OUT" : "ENTRY_IN";
    
    const newLog = new StudentLog({
      enrollment: enroll,
      type: newStatus,
      denied: false,
      timestamp: new Date(),
      lastedit_timestamp: new Date(),
      update_count: 0
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
      logToUpdate.type = 'ENTRY_IN';
    } else if (status === 'OUT' || status === 'ENTRY_OUT') {
      logToUpdate.type = 'ENTRY_OUT';
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
