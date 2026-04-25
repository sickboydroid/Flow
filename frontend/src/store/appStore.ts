/**
 * Top-level app state: which tab is active, whether RFID scans are accepted,
 * and the latest scanned student card shown on the dashboard.
 *
 * Components subscribe to this store rather than reaching for globals.
 */

import { BaseStore } from './BaseStore';
import type { StudentInfo, StudentStatus } from '../core/types';

export type TabName = 'dashboard' | 'students' | 'vehicles' | 'visitors' | 'analytics';

export interface AppState {
  activeTab: TabName;
  isAcceptingScans: boolean;
  lastScanned: { student: StudentInfo; status: StudentStatus } | null;
}

class AppStore extends BaseStore<AppState> {
  setActiveTab(tab: TabName): void {
    this.setState({ activeTab: tab, isAcceptingScans: tab === 'dashboard' });
  }

  setAcceptingScans(value: boolean): void {
    this.setState({ isAcceptingScans: value });
  }

  setLastScanned(student: StudentInfo, status: StudentStatus): void {
    this.setState({ lastScanned: { student, status } });
  }

  clearLastScanned(): void {
    this.setState({ lastScanned: null });
  }
}

export const appStore = new AppStore({
  activeTab: 'dashboard',
  isAcceptingScans: true,
  lastScanned: null,
});
