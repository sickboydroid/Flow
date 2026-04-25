/**
 * RFID scanner feature.
 *
 * Behaviour preserved from the legacy code:
 *   - Press Alt+0..9 to simulate scanning one of 10 mock RFID cards.
 *   - Only fires when the dashboard tab is active and scanning is allowed
 *     (no dialog open).
 *   - Debounces re-scans of the same enrollment within 10 seconds.
 *   - On a successful scan: backend toggle, snackbar feedback, update the
 *     `appStore.lastScanned`, and emit `scan:processed` + `logs:changed`
 *     so the dashboard refreshes the list and ripples the new row.
 */

import { studentsApi } from '../../api/students';
import { recentLogsApi } from '../../api/recentLogs';
import { EventBus } from '../../core/EventBus';
import type { StudentInfo, StudentStatus } from '../../core/types';
import { appStore } from '../../store/appStore';

const RFID_POOL: readonly string[] = [
  '0xED89DE79',
  '0x212F54D6',
  '0x7D91AFAE',
  '0xCFE5AEFC',
  '0xAEBCB5CE',
  '0xA66FA610',
  '0xC7AC17FD',
  '0x6AB8D9EA',
  '0xFEEECF11',
  '0xBF1F200A',
];

const DEBOUNCE_MS = 10_000;

export class Scanner {
  private boundKeydown: (e: KeyboardEvent) => void;
  private lastScanByEnroll = new Map<string, number>();

  constructor() {
    this.boundKeydown = (e: KeyboardEvent): void => this.handleKey(e);
  }

  start(): void {
    window.addEventListener('keydown', this.boundKeydown);
  }

  stop(): void {
    window.removeEventListener('keydown', this.boundKeydown);
  }

  /** Programmatically simulate a scan; useful for tests / debugging. */
  simulate(rfid: string): Promise<void> {
    return this.scan(rfid);
  }

  private handleKey(e: KeyboardEvent): void {
    if (!e.altKey) return;
    if (e.key < '0' || e.key > '9') return;
    e.preventDefault();
    const idx = parseInt(e.key, 10);
    const rfid = RFID_POOL[idx] ?? RFID_POOL[0];
    void this.scan(rfid);
  }

  private async scan(rfid: string): Promise<void> {
    const state = appStore.getState();
    if (state.activeTab !== 'dashboard') {
      EventBus.emit('snackbar:show', { message: 'Switch to Dashboard to scan', type: 'info' });
      return;
    }
    if (!state.isAcceptingScans) {
      EventBus.emit('snackbar:show', { message: 'Scanning is paused', type: 'info' });
      return;
    }

    const enroll = await studentsApi.isValidRfid(rfid);
    if (!enroll) {
      EventBus.emit('snackbar:show', { message: 'Invalid RFID Card', type: 'error' });
      return;
    }

    const last = this.lastScanByEnroll.get(enroll);
    if (last && Date.now() - last < DEBOUNCE_MS) {
      EventBus.emit('snackbar:show', {
        message: 'Scanned too quickly. Please wait.',
        type: 'error',
      });
      return;
    }

    const ok = await studentsApi.updateStatus(enroll);
    if (!ok) {
      EventBus.emit('snackbar:show', { message: 'Failed to update status', type: 'error' });
      return;
    }

    this.lastScanByEnroll.set(enroll, Date.now());
    const [info, logs] = await Promise.all([
      studentsApi.getInfo(enroll),
      recentLogsApi.list(20),
    ]);

    if (!info) {
      EventBus.emit('snackbar:show', { message: 'Scan recorded (info unavailable)', type: 'success' });
      EventBus.emit('logs:changed', { domain: 'student' });
      EventBus.emit('scan:processed', { enrollment: enroll });
      return;
    }

    const status = this.deriveStatus(logs, enroll);
    appStore.setLastScanned(info, status);
    EventBus.emit('logs:changed', { domain: 'student' });
    EventBus.emit('scan:processed', { enrollment: enroll });
    this.notifySuccess(info, status);
  }

  private deriveStatus(
    logs: Awaited<ReturnType<typeof recentLogsApi.list>>,
    enroll: string
  ): StudentStatus {
    for (const l of logs) {
      if (l.logType === 'student' && l.enrollment === enroll) {
        return (l.status ?? l.type) as StudentStatus;
      }
    }
    return 'IN';
  }

  private notifySuccess(info: StudentInfo, status: StudentStatus): void {
    EventBus.emit('snackbar:show', {
      message: `Scanned: ${info.firstName} ${info.lastName} — ${status}`,
      type: 'success',
    });
  }
}
