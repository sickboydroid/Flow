import { Request, Response } from "express";
import { Student } from "../models/student.model.js";
import { StudentLog } from "../models/studentLog.model.js";

// GET /api/valid?rfid={RFID} or /api/valid?enroll={ENROLLMENT}
export const checkValid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rfid, enroll } = req.query;

    if (!rfid && !enroll) {
      res.status(400).json({ error: "Provide either rfid or enroll" });
      return;
    }

    let student = null;
    if (rfid) {
      student = await Student.findOne({ rfid: rfid as string });
    } else if (enroll) {
      student = await Student.findOne({ enrollment: enroll as string });
    }

    if (!student) {
      res.status(404).json({ valid: false });
      return;
    }

    res.status(200).json({ valid: true, enrollment: student.enrollment });
    return;
  } catch (error) {
    console.error("Error in checkValid:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};

// GET /api/logs
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      limit = '100', 
      offset = '0', 
      after, 
      before, 
      denied = 'false',
      unique = 'false',
      search,
      roles,
      genders,
      statuses
    } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (unique === 'true') {
      // ADVANCED AGGREGATION FOR UNIQUE STUDENTS VIEW
      const matchStage: any = {};

      if (genders) {
        matchStage.gender = { $in: (genders as string).split(',').map(s => s.toLowerCase()) };
      }

      if (roles) {
        const rolesArr = (roles as string).split(',').map(s => s.toLowerCase());
        const isHostellerMatch: boolean[] = [];
        if (rolesArr.includes('hostellers')) isHostellerMatch.push(true);
        if (rolesArr.includes('day scholars')) isHostellerMatch.push(false);
        if (isHostellerMatch.length > 0) {
          matchStage.isHosteller = { $in: isHostellerMatch };
        }
      }

      const pipeline: any[] = [{ $match: matchStage }];

      // Fuzzy Search matching and scoring
      if (search && typeof search === 'string' && search.trim() !== '') {
        const queryTerm = search.trim();
        // Standard fuzzy regex matching substrings
        const regex = new RegExp(queryTerm.split('').join('.*?'), 'i'); 
        
        pipeline.push({
          $match: {
            $or: [
              { firstName: { $regex: regex } },
              { lastName: { $regex: regex } },
              { enrollment: { $regex: regex } },
              { address: { $regex: regex } }
            ]
          }
        });

        // Add a score field for closest matches
        pipeline.push({
          $addFields: {
            searchScore: {
              $cond: [ { $regexMatch: { input: "$firstName", regex: new RegExp(`^${queryTerm}`, 'i') } }, 3,
                { $cond: [ { $regexMatch: { input: "$lastName", regex: new RegExp(`^${queryTerm}`, 'i') } }, 2, 1 ] }
              ]
            }
          }
        });
      }

      // Lookup their latest log
      pipeline.push({
        $lookup: {
          from: "studentlogs",
          let: { enroll: "$enrollment" },
          pipeline: [
            { $match: { $expr: { $eq: ["$enrollment", "$$enroll"] }, denied: false } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: "latestLog"
        }
      });

      pipeline.push({
        $unwind: { path: "$latestLog", preserveNullAndEmptyArrays: true }
      });

      // Filter by Statuses from front end (e.g., 'IN', 'OUT')
      if (statuses) {
        const statusesArr = (statuses as string).split(',').map(s => s.toUpperCase());
        const dbStatuses = statusesArr; // directly map IN, OUT, LEAVE
        
        // If "In" or "Out" is selected, filter based on the injected latestLog type.
        // If checking for latestLog type, we skip checking elements where it's null, unless we allow filtering by NO LOG. 
        // For simplicity, we just filter those that match the type exactly.
        pipeline.push({
          $match: {
            "latestLog.type": { $in: dbStatuses }
          }
        });
      }

      // Sorting
      let sortStage: any = {};
      if (search) {
        sortStage.searchScore = -1;
      }
      sortStage['latestLog.timestamp'] = -1; // Newest activity first
      sortStage['firstName'] = 1;

      pipeline.push({ $sort: sortStage });

      // Build Facet for Total Count and Pagination Data
      pipeline.push({
        $facet: {
          metadata: [ { $count: "total" } ],
          data: [ { $skip: parsedOffset }, { $limit: parsedLimit } ]
        }
      });

      const result = await Student.aggregate(pipeline);
      
      const totalCount = result[0].metadata[0]?.total || 0;
      const data = result[0].data.map((student: any) => {
        // Map the payload seamlessly to what the frontend expects
        return {
          _id: student.latestLog ? student.latestLog._id : null,
          enrollment: student.enrollment,
          status: student.latestLog ? student.latestLog.type : 'NO ACTIVITY',
          timestamp: student.latestLog ? student.latestLog.timestamp : null,
          denied: false,
          student: {
             firstName: student.firstName,
             lastName: student.lastName,
             enrollment: student.enrollment,
             gender: student.gender,
             branch: student.branch,
             picUrl: student.picUrl,
             address: student.address,
             isHosteller: student.isHosteller,
             phoneNumber: student.phoneNumber
          }
        };
      });

      res.status(200).json({ logs: data, totalCount });
      return;
    }

    // NORMAL LOG VIEW (used by dashboard recent logs panel)
    const query: any = {};
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
      .skip(parsedOffset)
      .limit(parsedLimit)
      .populate("student");
    
    res.status(200).json({ logs, totalCount: logs.length });
    return;
  } catch (error) {
    console.error("Error in getLogs:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};
