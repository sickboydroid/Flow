const API_BASE = 'http://localhost:5000/api';

export interface StudentInfo {
  enrollment: string;
  firstName: string;
  lastName: string;
  branch: string;
  isHosteller: boolean;
  phoneNumber?: string;
  rfid?: string;
  [key: string]: any;
}

export interface StudentLog {
  _id: string;
  studentId: string;
  enrollment: string;
  status: 'IN' | 'OUT' | 'NO ACTIVITY';
  timestamp: string | Date | null;
  denied: boolean;
  studentName?: string;
  [key: string]: any;
}

export const api = {
  async isValidRfid(rfid: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/valid?rfid=${encodeURIComponent(rfid)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.enrollment || null;
    } catch {
      return null;
    }
  },

  async isValidEnroll(enroll: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/valid?enroll=${encodeURIComponent(enroll)}`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getStudentInfo(enroll: string): Promise<StudentInfo | null> {
    try {
      const res = await fetch(`${API_BASE}/student/info?enroll=${encodeURIComponent(enroll)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.student || null;
    } catch {
      return null;
    }
  },

  async getStudentStatus(enroll: string): Promise<'IN' | 'OUT'> {
    try {
      const res = await fetch(`${API_BASE}/student/status?enroll=${encodeURIComponent(enroll)}`);
      if (!res.ok) return 'IN';
      const data = await res.json();
      return (data.status === 'ENTRY_IN' ? 'IN' : (data.status === 'ENTRY_OUT' ? 'OUT' : 'IN')) as 'IN' | 'OUT';
    } catch {
      return 'IN';
    }
  },

  async updateStudentStatus(enroll: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/student/update/status?enroll=${encodeURIComponent(enroll)}`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getLogs(params: { limit?: number; offset?: number; denied?: boolean; after?: string; before?: string; unique?: boolean; search?: string; roles?: string; genders?: string; statuses?: string } = {}): Promise<{ logs: StudentLog[], totalCount: number }> {
    try {
      const query = new URLSearchParams();
      if (params.limit !== undefined) query.append('limit', params.limit.toString());
      if (params.offset !== undefined) query.append('offset', params.offset.toString());
      if (params.denied !== undefined) query.append('denied', params.denied.toString());
      if (params.after !== undefined) query.append('after', params.after);
      if (params.before !== undefined) query.append('before', params.before);
      if (params.unique !== undefined) query.append('unique', params.unique.toString());
      if (params.search) query.append('search', params.search);
      if (params.roles) query.append('roles', params.roles);
      if (params.genders) query.append('genders', params.genders);
      if (params.statuses) query.append('statuses', params.statuses);

      const res = await fetch(`${API_BASE}/logs?${query.toString()}`);
      if (!res.ok) return { logs: [], totalCount: 0 };
      
      const data = await res.json();
      const logsArray = Array.isArray(data) ? data : data.logs || data.data || [];
      const totalCount = data.totalCount || 0;
      
      const parsedLogs = logsArray.map((log: any) => ({
        ...log,
        status: log.type === 'ENTRY_IN' ? 'IN' : (log.type === 'ENTRY_OUT' ? 'OUT' : log.status || log.type)
      }));
      return { logs: parsedLogs, totalCount };
    } catch {
      return { logs: [], totalCount: 0 };
    }
  },

  async updateLog(enroll: string, logId: string, denied: boolean, status: string, timestamp: string): Promise<boolean> {
    try {
       const res = await fetch(`${API_BASE}/student/update/log?enroll=${encodeURIComponent(enroll)}&log_id=${encodeURIComponent(logId)}&denied=${denied}&status=${status}&timestamp=${encodeURIComponent(timestamp)}`, {
         method: 'PUT'
       });
       return res.ok;
    } catch {
       return false;
    }
  }
};
