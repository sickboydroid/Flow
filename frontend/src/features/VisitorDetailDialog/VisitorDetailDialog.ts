/**
 * Dialog showing a single visitor's full details with a "Mark as Left"
 * action when they're still inside.
 */

import { visitorsApi } from '../../api/visitors';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { VisitorLog } from '../../core/types';
import { DialogController } from '../../components/Dialog/Dialog';
import { initials } from '../../utils/text';
import { formatDateTime, formatTime } from '../../utils/time';
import template from './VisitorDetailDialog.html?raw';

interface FieldDef {
  label: string;
  value: string;
}

export class VisitorDetailDialog {
  private controller: DialogController;
  private dialogEl: HTMLDialogElement;
  private contentEl: HTMLElement;
  private bodyTpl: HTMLTemplateElement;
  private fieldTpl: HTMLTemplateElement;
  private current: VisitorLog | null = null;

  constructor(host: HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = template;
    host.appendChild(wrapper);

    this.dialogEl = wrapper.querySelector<HTMLDialogElement>('[data-dialog]')!;
    this.contentEl = this.dialogEl.querySelector<HTMLElement>('[data-content]')!;
    this.bodyTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-body]')!;
    this.fieldTpl = wrapper.querySelector<HTMLTemplateElement>('template[data-field]')!;

    this.controller = new DialogController(this.dialogEl);
    this.dialogEl.querySelector<HTMLButtonElement>('[data-close]')!
      .addEventListener('click', () => this.controller.close());
    renderIcons(this.dialogEl);
  }

  open(visitor: VisitorLog): void {
    this.current = visitor;
    this.draw(visitor);
    this.controller.open();
  }

  private draw(v: VisitorLog): void {
    const frag = this.bodyTpl.content.cloneNode(true) as DocumentFragment;
    frag.querySelector<HTMLElement>('[data-initials]')!.textContent = initials(
      v.first_name,
      v.last_name
    );
    frag.querySelector<HTMLElement>('[data-name]')!.textContent =
      `${v.first_name} ${v.last_name}`;

    const dept = frag.querySelector<HTMLElement>('[data-dept]')!;
    if (v.department) {
      dept.textContent = v.department;
      dept.classList.remove('hidden');
    }

    const fields: FieldDef[] = [
      { label: 'Status', value: v.has_left ? 'Left' : 'Inside' },
      { label: 'Time In', value: formatDateTime(v.time_in ?? v.timestamp) },
      { label: 'Time Out', value: v.time_out ? formatTime(v.time_out) : '—' },
      { label: 'Address', value: v.address || '—' },
      { label: 'Remarks', value: v.remarks || '—' },
    ];
    const fieldsEl = frag.querySelector<HTMLElement>('[data-fields]')!;
    for (const f of fields) {
      const node = this.fieldTpl.content.cloneNode(true) as DocumentFragment;
      node.querySelector<HTMLElement>('[data-label]')!.textContent = f.label;
      node.querySelector<HTMLElement>('[data-value]')!.textContent = f.value;
      fieldsEl.appendChild(node);
    }

    const markBtn = frag.querySelector<HTMLButtonElement>('[data-mark-out]')!;
    if (!v.has_left) {
      markBtn.classList.remove('hidden');
      markBtn.addEventListener('click', () => this.markLeft());
    }

    this.contentEl.replaceChildren(frag);
    renderIcons(this.contentEl);
  }

  private async markLeft(): Promise<void> {
    if (!this.current) return;
    const ok = await visitorsApi.markLeft(this.current._id);
    if (ok) {
      EventBus.emit('snackbar:show', { message: 'Visitor marked as left', type: 'success' });
      EventBus.emit('logs:changed', { domain: 'visitor' });
      this.controller.close();
    } else {
      EventBus.emit('snackbar:show', { message: 'Failed to update visitor', type: 'error' });
    }
  }
}
