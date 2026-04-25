/**
 * Combined "Add Entry" dialog with three tabs: Student / Vehicle / Visitor.
 * Each tab is its own subform component, instantiated lazily on first open.
 */

import { renderIcons } from '../../core/Icons';
import { DialogController } from '../../components/Dialog/Dialog';
import { StudentEntryForm } from './StudentEntryForm';
import { VehicleEntryForm } from './VehicleEntryForm';
import { VisitorEntryForm } from './VisitorEntryForm';
import template from './AddEntryDialog.html?raw';

type TabKey = 'student' | 'vehicle' | 'visitor';

const ACTIVE_TAB_CLASSES = ['text-blue-700', 'border-blue-600'] as const;
const INACTIVE_TAB_CLASSES = ['text-slate-500', 'border-transparent'] as const;

export class AddEntryDialog {
  private controller: DialogController;
  private dialogEl: HTMLDialogElement;
  private tabButtons: HTMLButtonElement[];
  private panes: Map<TabKey, HTMLElement>;
  private studentForm: StudentEntryForm;
  private vehicleForm: VehicleEntryForm;
  private visitorForm: VisitorEntryForm;
  private activeTab: TabKey = 'student';

  constructor(host: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = template;
    host.appendChild(wrapper);

    this.dialogEl = wrapper.querySelector<HTMLDialogElement>('[data-dialog]')!;
    this.tabButtons = Array.from(
      this.dialogEl.querySelectorAll<HTMLButtonElement>('.entry-tab-btn')
    );
    this.panes = new Map<TabKey, HTMLElement>();
    for (const key of ['student', 'vehicle', 'visitor'] as TabKey[]) {
      const pane = this.dialogEl.querySelector<HTMLElement>(`[data-pane="${key}"]`);
      if (!pane) throw new Error(`AddEntryDialog: missing pane "${key}"`);
      this.panes.set(key, pane);
    }

    this.studentForm = new StudentEntryForm(this.panes.get('student')!, undefined);
    this.vehicleForm = new VehicleEntryForm(this.panes.get('vehicle')!, undefined);
    this.visitorForm = new VisitorEntryForm(this.panes.get('visitor')!, undefined);
    this.studentForm.mount();
    this.vehicleForm.mount();
    this.visitorForm.mount();

    this.controller = new DialogController(this.dialogEl);
    this.dialogEl.querySelector<HTMLButtonElement>('[data-close]')!
      .addEventListener('click', () => this.controller.close());

    for (const btn of this.tabButtons) {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab as TabKey));
    }

    // Auto-close on a successful submit. The forms already reset themselves
    // after firing this event, so the dialog is clean the next time it opens.
    this.dialogEl.addEventListener('entry:submitted', () => this.controller.close());

    renderIcons(this.dialogEl);
  }

  open(initialTab?: TabKey): void {
    if (initialTab) this.switchTab(initialTab);
    this.controller.open();
  }

  close(): void {
    this.controller.close();
  }

  private switchTab(next: TabKey): void {
    if (this.activeTab === next) return;
    for (const btn of this.tabButtons) {
      const active = btn.dataset.tab === next;
      btn.classList.remove(...(active ? INACTIVE_TAB_CLASSES : ACTIVE_TAB_CLASSES));
      btn.classList.add(...(active ? ACTIVE_TAB_CLASSES : INACTIVE_TAB_CLASSES));
      btn.classList.toggle('font-semibold', active);
      btn.classList.toggle('font-medium', !active);
    }
    for (const [key, pane] of this.panes) {
      pane.classList.toggle('hidden', key !== next);
    }
    this.activeTab = next;
  }
}
