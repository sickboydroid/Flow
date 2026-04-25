/**
 * Pure helpers (no DOM mounting required) that return the right Tailwind
 * classes for a status pill. The legacy code repeated these mappings in
 * many places; centralizing here removes duplication.
 */

import type { Direction, StudentStatus } from '../../core/types';

const STUDENT_STATUS_CLASSES: Record<StudentStatus, string> = {
  IN: 'text-emerald-600 bg-emerald-50 ring-emerald-200',
  OUT: 'text-amber-600 bg-amber-50 ring-amber-200',
  LEAVE: 'text-blue-600 bg-blue-50 ring-blue-200',
  'NO ACTIVITY': 'text-slate-400 bg-slate-100 ring-slate-200',
};

const DIRECTION_CLASSES: Record<Direction, string> = {
  IN: 'bg-emerald-50 text-emerald-700',
  OUT: 'bg-amber-50 text-amber-700',
};

export const StatusBadge = {
  studentStatusClasses(status: StudentStatus): string {
    return STUDENT_STATUS_CLASSES[status];
  },
  directionClasses(type: Direction): string {
    return DIRECTION_CLASSES[type];
  },
};
