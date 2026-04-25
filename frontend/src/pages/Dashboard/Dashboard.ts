/**
 * Dashboard page = LastScannedPanel + RecentLogsList + "Add Entry" button.
 *
 * It composes the two child components, fetches the initial logs, and
 * forwards row click events into the appropriate dialog feature.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import type { StudentInfoDialog } from '../../features/StudentInfoDialog/StudentInfoDialog';
import type { VehicleHistoryDialog } from '../../features/VehicleHistoryDialog/VehicleHistoryDialog';
import type { VisitorDetailDialog } from '../../features/VisitorDetailDialog/VisitorDetailDialog';
import type { AddEntryDialog } from '../../features/AddEntryDialog/AddEntryDialog';
import { LastScannedPanel } from './LastScannedPanel';
import { RecentLogsList } from './RecentLogsList';
import template from './Dashboard.html?raw';

export interface DashboardProps {
  studentInfoDialog: StudentInfoDialog;
  vehicleHistoryDialog: VehicleHistoryDialog;
  visitorDetailDialog: VisitorDetailDialog;
  addEntryDialog: AddEntryDialog;
}

export class Dashboard extends Component<DashboardProps> {
  private recentLogs!: RecentLogsList;

  protected render(): void {
    this.root.classList.add(
      'grid',
      'grid-cols-1',
      'grid-rows-2',
      'lg:grid-cols-2',
      'lg:grid-rows-1',
      'gap-6',
      'min-h-0',
      'h-full'
    );
    this.root.insertAdjacentHTML('beforeend', template);

    const lastSlot = this.$('[data-slot="last-scanned"]');
    this.addChild(new LastScannedPanel(lastSlot, undefined));

    const subtitleEl = this.$('[data-recent-subtitle]');
    const listHost = this.$('[data-recent-list]');
    this.recentLogs = this.addChild(
      new RecentLogsList(listHost, {
        subtitleEl,
        onStudentClick: (enroll): void => {
          void this.props.studentInfoDialog.open(enroll);
        },
        onVehicleClick: (plate): void => {
          void this.props.vehicleHistoryDialog.open(plate);
        },
        onVisitorClick: (visitor): void => this.props.visitorDetailDialog.open(visitor),
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    const addBtn = this.$<HTMLButtonElement>('[data-add-entry]');
    this.on(addBtn, 'click', () => this.props.addEntryDialog.open());
    void this.recentLogs.refresh();
  }

  /** Trigger a refresh — used by the scanner ripple feedback. */
  refreshRecent(): Promise<void> {
    return this.recentLogs.refresh();
  }

  highlightStudent(enrollment: string): void {
    this.recentLogs.highlightStudent(enrollment);
  }
}
