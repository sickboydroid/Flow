/**
 * "Add Visitor Entry" form. Uses the soft `name` validator to reject
 * obvious garbage and offers a department hint dropdown.
 */

import { visitorsApi } from '../../api/visitors';
import { metadataApi } from '../../api/metadata';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { HintDropdown } from '../../components/HintDropdown/HintDropdown';
import { isValidName } from '../../validators/name';
import template from './VisitorEntryForm.html?raw';
import { renderIcons } from '../../core/Icons';

const HINT_DEBOUNCE_MS = 250;

export class VisitorEntryForm extends Component {
  private firstNameInput!: HTMLInputElement;
  private lastNameInput!: HTMLInputElement;
  private addressInput!: HTMLInputElement;
  private deptInput!: HTMLInputElement;
  private remarksInput!: HTMLInputElement;
  private submitBtn!: HTMLButtonElement;
  private deptHintRoot!: HTMLElement;
  private deptHints!: HintDropdown;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.firstNameInput = this.$<HTMLInputElement>('[data-first-name]');
    this.lastNameInput = this.$<HTMLInputElement>('[data-last-name]');
    this.addressInput = this.$<HTMLInputElement>('[data-address]');
    this.deptInput = this.$<HTMLInputElement>('[data-dept]');
    this.remarksInput = this.$<HTMLInputElement>('[data-remarks]');
    this.submitBtn = this.$<HTMLButtonElement>('[data-submit]');
    this.deptHintRoot = this.$('[data-dept-hint]');

    this.deptHints = this.addChild(
      new HintDropdown(this.deptHintRoot, {
        onPick: (value): void => {
          this.deptInput.value = value;
          this.deptInput.focus();
        },
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    this.on(this.deptInput, 'focus', () => void this.loadDeptHints());
    this.on(this.deptInput, 'input', () => void this.loadDeptHints());
    this.on(this.deptInput, 'blur', () => setTimeout(() => this.deptHints.hide(), 200));
    this.on(this.submitBtn, 'click', () => void this.submit());
  }

  override unmount(): void {
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    super.unmount();
  }

  reset(): void {
    this.firstNameInput.value = '';
    this.lastNameInput.value = '';
    this.addressInput.value = '';
    this.deptInput.value = '';
    this.remarksInput.value = '';
  }

  private loadDeptHints(): void {
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(async () => {
      const hints = await metadataApi.getHints('visitor_department', 5);
      const prefix = this.deptInput.value.trim().toLowerCase();
      const filtered = prefix ? hints.filter((h) => h.toLowerCase().includes(prefix)) : hints;
      this.deptHints.show(filtered);
    }, HINT_DEBOUNCE_MS);
  }

  private async submit(): Promise<void> {
    const firstName = this.firstNameInput.value.trim();
    const lastName = this.lastNameInput.value.trim();
    const address = this.addressInput.value.trim();
    const department = this.deptInput.value.trim();
    const remarks = this.remarksInput.value.trim();

    if (!isValidName(firstName)) {
      EventBus.emit('snackbar:show', { message: 'First name is required', type: 'error' });
      return;
    }
    if (!isValidName(lastName)) {
      EventBus.emit('snackbar:show', { message: 'Last name is required', type: 'error' });
      return;
    }

    const ok = await visitorsApi.addLog(firstName, lastName, address, department, remarks);
    if (ok) {
      EventBus.emit('snackbar:show', {
        message: `Visitor ${firstName} ${lastName} logged in`,
        type: 'success',
      });
      EventBus.emit('logs:changed', { domain: 'visitor' });
      this.emit('entry:submitted', { domain: 'visitor' });
      this.reset();
    } else {
      EventBus.emit('snackbar:show', { message: 'Failed to add visitor log', type: 'error' });
    }
  }
}
