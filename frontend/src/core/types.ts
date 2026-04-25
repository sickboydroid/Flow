/**
 * Shared domain types used across the frontend.
 *
 * Mirror the backend response shapes. Anywhere the backend may add fields
 * later, we keep an `extra` index signature to avoid silent breakage while
 * still letting strict TypeScript guard the known fields.
 */

export type StudentStatus = 'IN' | 'OUT' | 'LEAVE' | 'NO ACTIVITY';
export type LogType = 'IN' | 'OUT' | 'LEAVE';
export type Direction = 'IN' | 'OUT';
export type Gender = 'male' | 'female' | 'other';
export type ModeOfEntry = 'RFID' | 'MANUAL';

export interface StudentInfo {
  enrollment: string;
  firstName: string;
  lastName: string;
  branch: string;
  year?: string | number;
  gender?: Gender;
  isHosteller: boolean;
  phoneNumber?: string;
  address?: string;
  rfid?: string;
  pic_url?: string;
}

export interface StudentLog {
  _id: string;
  enrollment: string;
  type: LogType;
  timestamp: string;
  mode_of_entry?: ModeOfEntry;
  remarks?: string;
  deleted?: boolean;
}

/** Aggregate row used in the Students tab listing (one per student, latest log). */
export interface StudentTableRow {
  enrollment: string;
  status: StudentStatus;
  timestamp: string | null;
  student?: StudentInfo;
}

export interface StudentStats {
  totalLogs: number;
  totalIn: number;
  totalOut: number;
  totalLeave: number;
  totalInDuration?: number;
  totalOutDuration?: number;
  totalLeaveDuration?: number;
}

export interface VehicleLog {
  _id: string;
  plate: string;
  type_of_vehicle: string;
  type: Direction;
  timestamp: string;
  remarks?: string;
}

export interface VisitorLog {
  _id: string;
  first_name: string;
  last_name: string;
  address?: string;
  department?: string;
  time_in?: string;
  time_out?: string;
  has_left: boolean;
  remarks?: string;
  timestamp: string;
}

/**
 * Discriminated union returned by /recent-logs. The `logType` field is the
 * discriminator; each variant extends its base record with that tag plus a
 * `status` for student rows (mirrors `type` for compatibility).
 */
export type RecentLog =
  | (StudentLog & { logType: 'student'; status?: StudentStatus; student?: StudentInfo })
  | (VehicleLog & { logType: 'vehicle' })
  | (VisitorLog & { logType: 'visitor' });

export interface AnalyticsTotals {
  students: number;
  studentLogs: number;
  vehicleLogs: number;
  visitorLogs: number;
  totalLogs: number;
}

export interface AnalyticsResponse {
  totals: AnalyticsTotals;
}

export interface CursorPage<T> {
  logs: T[];
  nextCursor: string | null;
  totalPages?: number;
}

export interface StudentFilters {
  roles: string[];
  genders: string[];
  statuses: string[];
}

export type SnackbarType = 'success' | 'error' | 'info';

export type HintType = 'vehicle_type' | 'visitor_department' | 'student_enrollment';
