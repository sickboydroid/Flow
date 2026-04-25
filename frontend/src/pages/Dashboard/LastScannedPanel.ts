/**
 * Right-half of the dashboard sidebar — shows the most recently scanned
 * student or an empty placeholder. Listens to `appStore.lastScanned`.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import { appStore } from '../../store/appStore';
import type { StudentInfo, StudentStatus } from '../../core/types';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { fallbackAvatarUrl, profilePicUrl } from '../../utils/profilePic';
import template from './LastScannedPanel.html?raw';

interface FieldDef {
  label: string;
  value: string;
}

export class LastScannedPanel extends Component {
  private content!: HTMLElement;
  private emptyTpl!: HTMLTemplateElement;
  private cardTpl!: HTMLTemplateElement;
  private fieldTpl!: HTMLTemplateElement;
  private unsub: (() => void) | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.content = this.$('[data-content]');
    this.emptyTpl = this.$<HTMLTemplateElement>('template[data-empty]');
    this.cardTpl = this.$<HTMLTemplateElement>('template[data-card]');
    this.fieldTpl = this.$<HTMLTemplateElement>('template[data-field]');
    this.draw();
  }

  protected bind(): void {
    this.unsub = appStore.subscribe(() => this.draw());
  }

  override unmount(): void {
    this.unsub?.();
    super.unmount();
  }

  private draw(): void {
    const last = appStore.getState().lastScanned;
    this.content.replaceChildren();
    if (!last) {
      this.content.appendChild(this.emptyTpl.content.cloneNode(true));
    } else {
      this.content.appendChild(this.buildCard(last.student, last.status));
    }
    renderIcons(this.content);
  }

  private buildCard(s: StudentInfo, status: StudentStatus): DocumentFragment {
    const frag = this.cardTpl.content.cloneNode(true) as DocumentFragment;

    const photo = frag.querySelector<HTMLImageElement>('[data-photo]')!;
    photo.src = profilePicUrl(s.enrollment);
    photo.addEventListener(
      'error',
      () => {
        photo.onerror = null;
        photo.src = fallbackAvatarUrl(s.firstName, 112);
      },
      { once: true }
    );

    const statusEl = frag.querySelector<HTMLElement>('[data-status]')!;
    statusEl.textContent = status;
    statusEl.classList.add(...StatusBadge.studentStatusClasses(status).split(' '));

    frag.querySelector<HTMLElement>('[data-name]')!.textContent = `${s.firstName} ${s.lastName}`;
    frag.querySelector<HTMLElement>('[data-enroll]')!.textContent = s.enrollment;

    const fields: FieldDef[] = [
      { label: 'Branch', value: s.branch || 'N/A' },
      { label: 'Year', value: String(s.year ?? 'N/A') },
      { label: 'Gender', value: s.gender || 'N/A' },
      { label: 'Role', value: s.isHosteller ? 'Hosteller' : 'Day Scholar' },
      { label: 'Phone', value: s.phoneNumber || 'Not provided' },
      { label: 'Address', value: s.address || 'N/A' },
    ];
    const fieldsEl = frag.querySelector<HTMLElement>('[data-fields]')!;
    for (const f of fields) {
      const node = this.fieldTpl.content.cloneNode(true) as DocumentFragment;
      node.querySelector<HTMLElement>('[data-label]')!.textContent = f.label;
      node.querySelector<HTMLElement>('[data-value]')!.textContent = f.value;
      fieldsEl.appendChild(node);
    }
    return frag;
  }
}
