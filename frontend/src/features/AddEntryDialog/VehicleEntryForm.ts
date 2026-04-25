/**
 * "Add Vehicle Log" form. Validates the plate via `validators/plate.ts`,
 * supports type-of-vehicle hint dropdown, and posts the log on submit.
 */

import { vehiclesApi } from '../../api/vehicles';
import { metadataApi } from '../../api/metadata';
import { Component } from '../../core/Component';
import { EventBus } from '../../core/EventBus';
import type { Direction } from '../../core/types';
import { HintDropdown } from '../../components/HintDropdown/HintDropdown';
import { isValidIndianPlate, normalizePlate } from '../../validators/plate';
import template from './VehicleEntryForm.html?raw';

const HINT_DEBOUNCE_MS = 250;

export class VehicleEntryForm extends Component {
  private plateInput!: HTMLInputElement;
  private typeInput!: HTMLInputElement;
  private remarksInput!: HTMLInputElement;
  private submitBtn!: HTMLButtonElement;
  private radioInputs!: HTMLInputElement[];
  private typeHintRoot!: HTMLElement;
  private typeHints!: HintDropdown;

  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.plateInput = this.$<HTMLInputElement>('[data-plate]');
    this.typeInput = this.$<HTMLInputElement>('[data-type-input]');
    this.remarksInput = this.$<HTMLInputElement>('[data-remarks]');
    this.submitBtn = this.$<HTMLButtonElement>('[data-submit]');
    this.radioInputs = this.$$<HTMLInputElement>('input[name="vehicle-type"]');
    this.typeHintRoot = this.$('[data-type-hint]');

    this.typeHints = this.addChild(
      new HintDropdown(this.typeHintRoot, {
        onPick: (value): void => {
          this.typeInput.value = value;
          this.typeInput.focus();
        },
      })
    );
  }

  protected bind(): void {
    this.on(this.typeInput, 'focus', () => void this.loadTypeHints());
    this.on(this.typeInput, 'input', () => void this.loadTypeHints());
    this.on(this.typeInput, 'blur', () => setTimeout(() => this.typeHints.hide(), 200));
    this.on(this.plateInput, 'blur', () => {
      this.plateInput.value = normalizePlate(this.plateInput.value);
    });
    this.on(this.submitBtn, 'click', () => void this.submit());
  }

  override unmount(): void {
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    super.unmount();
  }

  reset(): void {
    this.plateInput.value = '';
    this.typeInput.value = '';
    this.remarksInput.value = '';
    for (const r of this.radioInputs) r.checked = r.dataset.direction === 'IN';
  }

  private loadTypeHints(): void {
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(async () => {
      const hints = await metadataApi.getHints('vehicle_type', 5);
      const prefix = this.typeInput.value.trim().toLowerCase();
      const filtered = prefix ? hints.filter((h) => h.toLowerCase().includes(prefix)) : hints;
      this.typeHints.show(filtered);
    }, HINT_DEBOUNCE_MS);
  }

  private async submit(): Promise<void> {
    const plate = normalizePlate(this.plateInput.value);
    const typeOfVehicle = this.typeInput.value.trim();
    const remarks = this.remarksInput.value.trim();
    const radio = this.radioInputs.find((r) => r.checked);
    const direction = (radio?.dataset.direction as Direction) ?? 'IN';

    if (!plate) {
      EventBus.emit('snackbar:show', { message: 'Plate is required', type: 'error' });
      return;
    }
    if (!isValidIndianPlate(plate)) {
      EventBus.emit('snackbar:show', {
        message: 'Plate must follow the Indian format (e.g. MH 04 AB 1234)',
        type: 'error',
      });
      return;
    }
    if (!typeOfVehicle) {
      EventBus.emit('snackbar:show', { message: 'Type of vehicle is required', type: 'error' });
      return;
    }

    const ok = await vehiclesApi.addLog(plate, typeOfVehicle, direction, remarks);
    if (ok) {
      EventBus.emit('snackbar:show', { message: `Vehicle ${plate} logged ${direction}`, type: 'success' });
      EventBus.emit('logs:changed', { domain: 'vehicle' });
      this.emit('entry:submitted', { domain: 'vehicle' });
      this.reset();
    } else {
      EventBus.emit('snackbar:show', { message: 'Failed to add vehicle log', type: 'error' });
    }
  }
}
