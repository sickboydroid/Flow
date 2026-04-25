/**
 * Centralized lucide icon registry.
 *
 * Lucide is tree-shakable; importing every icon up front keeps the bundle
 * predictable and means components don't each have to remember which icons
 * they use. New icons are added once, here, and become available everywhere.
 */

import {
  createIcons,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Car,
  Check,
  CheckCircle,
  GraduationCap,
  History,
  Info,
  LayoutDashboard,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide';

const REGISTRY = {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Car,
  Check,
  CheckCircle,
  GraduationCap,
  History,
  Info,
  LayoutDashboard,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
};

/** Replace `<i data-lucide="..."></i>` placeholders inside `root` with SVGs. */
export function renderIcons(root?: HTMLElement): void {
  createIcons({
    icons: REGISTRY,
    nameAttr: 'data-lucide',
    ...(root ? { root } : {}),
  });
}
