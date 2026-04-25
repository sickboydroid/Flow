/**
 * "Add Student Entry" form inside the AddEntryDialog.
 *
 * Behavior preserved from the legacy flow:
 *   - Debounced enrollment validation against the backend
 *   - Live preview card with student photo + meta when valid
 *   - LEAVE radio enabled only for hostellers
 *   - Submit posts a manual student log
 *
 * NOTE: in the legacy code, the auto-decided IN/OUT/LEAVE for the manual
 * entry path was computed on the frontend by inspecting the latest log.
 * That logic belongs on the backend (rewamp.md) — this form keeps the
 * user-chosen radio for now and emits whatever the user picked.
 */

import { studentsApi } from '../../api/students';
import { metadataApi } from '../../api/metadata';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import { renderIcons } from '../../core/Icons';
import type { LogType, StudentInfo } from '../../core/types';
import { HintDropdown } from '../../components/HintDropdown/HintDropdown';
import { fallbackAvatarUrl, profilePicUrl } from '../../utils/profilePic';
import {
  isValidEnrollmentFormat,
  normalizeEnrollment,
} from '../../validators/enrollment';
import template from './StudentEntryForm.html?raw';

const VALIDATE_DEBOUNCE_MS = 500;
const HINT_DEBOUNCE_MS = 250;

export class StudentEntryForm extends Component {
  private enrollInput!: HTMLInputElement;
  private statusIcon!: HTMLElement;
  private iconChecking!: HTMLElement;
  private iconValid!: HTMLElement;
  private iconInvalid!: HTMLElement;
  private hintRoot!: HTMLElement;
  private previewRoot!: HTMLElement;
  private leaveLabel!: HTMLElement;
  private submitBtn!: HTMLButtonElement;
  private radioInputs!: HTMLInputElement[];

  private previewLoadingTpl!: HTMLTemplateElement;
  private previewInvalidTpl!: HTMLTemplateElement;
  private previewValidTpl!: HTMLTemplateElement;

  private hintDropdown!: HintDropdown;
  private currentInfo: StudentInfo | null = null;
  private validateTimer: ReturnType<typeof setTimeout> | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.enrollInput = this.$<HTMLInputElement>('[data-enroll]');
    this.statusIcon = this.$('[data-status-icon]');
    this.iconChecking = this.$('[data-icon-checking]');
    this.iconValid = this.$('[data-icon-valid]');
    this.iconInvalid = this.$('[data-icon-invalid]');
    this.hintRoot = this.$('[data-hint]');
    this.previewRoot = this.$('[data-preview]');
    this.leaveLabel = this.$('[data-leave-label]');
    this.submitBtn = this.$<HTMLButtonElement>('[data-submit]');
    this.radioInputs = this.$$<HTMLInputElement>('input[name="student-type"]');

    this.previewLoadingTpl = this.$<HTMLTemplateElement>('template[data-preview-loading]');
    this.previewInvalidTpl = this.$<HTMLTemplateElement>('template[data-preview-invalid]');
    this.previewValidTpl = this.$<HTMLTemplateElement>('template[data-preview-valid]');

    this.hintDropdown = this.addChild(
      new HintDropdown(this.hintRoot, {
        onPick: (value): void => {
          this.enrollInput.value = value;
          this.scheduleValidate();
          this.enrollInput.focus();
        },
      })
    );

    renderIcons(this.root);
  }

  protected bind(): void {
    this.on(this.enrollInput, 'input', () => this.handleInput());
    this.on(this.enrollInput, 'focus', () => this.handleInput(true));
    this.on(this.enrollInput, 'blur', () => {
      // Slight delay so a click on a hint registers before we hide.
      setTimeout(() => this.hintDropdown.hide(), 200);
    });
    for (const r of this.radioInputs) {
      this.on(r, 'change', () => this.refreshSubmitState());
    }
    this.on(this.submitBtn, 'click', () => void this.submit());
  }

  override unmount(): void {
    if (this.validateTimer !== null) clearTimeout(this.validateTimer);
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    super.unmount();
  }

  reset(): void {
    this.enrollInput.value = '';
    this.previewRoot.classList.add('hidden');
    this.previewRoot.replaceChildren();
    this.statusIcon.classList.add('hidden');
    this.currentInfo = null;
    for (const r of this.radioInputs) r.checked = false;
    this.leaveLabel.classList.add('opacity-40', 'pointer-events-none');
    this.refreshSubmitState();
  }

  private handleInput(forceHints = false): void {
    const value = this.enrollInput.value;
    if (forceHints || value.length === 0) this.scheduleHints(value);
    else this.scheduleHints(value);
    this.scheduleValidate();
  }

  private scheduleHints(prefix: string): void {
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(async () => {
      const hints = await metadataApi.getHints('student_enrollment', 5);
      const filtered = prefix
        ? hints.filter((h) => h.toUpperCase().startsWith(prefix.toUpperCase()))
        : hints;
      this.hintDropdown.show(filtered);
    }, HINT_DEBOUNCE_MS);
  }

  private scheduleValidate(): void {
    if (this.validateTimer !== null) clearTimeout(this.validateTimer);
    const raw = this.enrollInput.value;
    const value = normalizeEnrollment(raw);

    this.statusIcon.classList.add('hidden');
    this.previewRoot.classList.add('hidden');
    this.previewRoot.replaceChildren();
    this.currentInfo = null;
    this.refreshSubmitState();

    if (value.length === 0) return;

    if (!isValidEnrollmentFormat(value)) {
      this.showInvalidPreview();
      return;
    }

    this.statusIcon.classList.remove('hidden');
    this.iconChecking.classList.remove('hidden');
    this.iconValid.classList.add('hidden');
    this.iconInvalid.classList.add('hidden');
    this.previewRoot.classList.remove('hidden');
    this.previewRoot.replaceChildren(this.previewLoadingTpl.content.cloneNode(true));

    this.validateTimer = setTimeout(() => void this.runValidate(value), VALIDATE_DEBOUNCE_MS);
  }

  private async runValidate(value: string): Promise<void> {
    const info = await studentsApi.getInfo(value);
    this.iconChecking.classList.add('hidden');
    if (!info) {
      this.iconInvalid.classList.remove('hidden');
      this.showInvalidPreview();
      return;
    }
    this.iconValid.classList.remove('hidden');
    this.currentInfo = info;
    this.showValidPreview(info);
    if (info.isHosteller) this.leaveLabel.classList.remove('opacity-40', 'pointer-events-none');
    else this.leaveLabel.classList.add('opacity-40', 'pointer-events-none');
    this.refreshSubmitState();
  }

  private showInvalidPreview(): void {
    this.previewRoot.classList.remove('hidden');
    this.previewRoot.replaceChildren(this.previewInvalidTpl.content.cloneNode(true));
    renderIcons(this.previewRoot);
  }

  private showValidPreview(info: StudentInfo): void {
    const frag = this.previewValidTpl.content.cloneNode(true) as DocumentFragment;
    const photo = frag.querySelector<HTMLImageElement>('[data-photo]')!;
    const name = `${info.firstName} ${info.lastName}`;
    photo.src = profilePicUrl(info.enrollment);
    photo.addEventListener(
      'error',
      () => {
        photo.onerror = null;
        photo.src = fallbackAvatarUrl(name, 40);
      },
      { once: true }
    );
    frag.querySelector<HTMLElement>('[data-name]')!.textContent = name;
    frag.querySelector<HTMLElement>('[data-meta]')!.textContent = [
      info.branch,
      info.year ? String(info.year) : null,
      info.isHosteller ? 'Hosteller' : 'Day Scholar',
    ]
      .filter(Boolean)
      .join(' • ');
    this.previewRoot.replaceChildren(frag);
  }

  private refreshSubmitState(): void {
    const hasType = this.radioInputs.some((r) => r.checked);
    this.submitBtn.disabled = !this.currentInfo || !hasType;
  }

  private async submit(): Promise<void> {
    if (!this.currentInfo) return;
    const radio = this.radioInputs.find((r) => r.checked);
    if (!radio) return;
    const type = radio.dataset.type as LogType;
    const ok = await studentsApi.addManualLog(this.currentInfo.enrollment, type);
    if (ok) {
      EventBus.emit('snackbar:show', {
        message: `Manual ${type} logged for ${this.currentInfo.firstName}`,
        type: 'success',
      });
      EventBus.emit('logs:changed', { domain: 'student' });
      this.emit('entry:submitted', { domain: 'student' });
      this.reset();
    } else {
      EventBus.emit('snackbar:show', {
        message: 'Failed to add log. Please try again.',
        type: 'error',
      });
    }
  }
}
