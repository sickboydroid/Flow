/**
 * Analytics tab — simple totals grid. Refetched on enter and whenever
 * any domain logs change.
 */

import { analyticsApi } from '../../api/analytics';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import template from './Analytics.html?raw';

export class Analytics extends Component {
  private studentsEl!: HTMLElement;
  private studentLogsEl!: HTMLElement;
  private vehicleLogsEl!: HTMLElement;
  private visitorLogsEl!: HTMLElement;
  private totalEl!: HTMLElement;
  private unsubBus: (() => void) | null = null;
  private isActive = false;

  protected render(): void {
    this.root.classList.add('flex', 'flex-col', 'h-full', 'overflow-y-auto', 'custom-scrollbar');
    this.root.insertAdjacentHTML('beforeend', template);

    this.studentsEl = this.$('[data-students]');
    this.studentLogsEl = this.$('[data-student-logs]');
    this.vehicleLogsEl = this.$('[data-vehicle-logs]');
    this.visitorLogsEl = this.$('[data-visitor-logs]');
    this.totalEl = this.$('[data-total]');

    renderIcons(this.root);
  }

  protected bind(): void {
    this.unsubBus = EventBus.on('logs:changed', () => {
      if (this.isActive) void this.fetchAndRender();
    });
  }

  override unmount(): void {
    this.unsubBus?.();
    super.unmount();
  }

  onEnter(): void {
    this.isActive = true;
    void this.fetchAndRender();
  }

  onLeave(): void {
    this.isActive = false;
  }

  private async fetchAndRender(): Promise<void> {
    const data = await analyticsApi.get();
    if (!data) return;
    const t = data.totals;
    this.studentsEl.textContent = String(t.students);
    this.studentLogsEl.textContent = String(t.studentLogs);
    this.vehicleLogsEl.textContent = String(t.vehicleLogs);
    this.visitorLogsEl.textContent = String(t.visitorLogs);
    this.totalEl.textContent = String(t.totalLogs);
  }
}
