/**
 * Chip-row of mutually exclusive (or toggleable) filter buttons.
 *
 * Behavior matches the legacy filter pills:
 *   - Click a chip → it becomes the only "active" one in the group.
 *   - Click an already-active chip → it deactivates (no chip selected).
 *
 * The component is value-driven: the parent passes `selected` and an
 * `onChange` handler that receives the new selected value (or `null`).
 */

import { Component } from '../../core/Component';
import template from './FilterGroup.html?raw';

export interface FilterItem<V extends string = string> {
  value: V;
  label: string;
  /** Optional: extra padding for wider labels. Defaults to "px-4". */
  px?: 'px-3' | 'px-4';
}

export interface FilterGroupProps<V extends string = string> {
  items: FilterItem<V>[];
  initialValue?: V | null;
  onChange: (value: V | null) => void;
}

const ACTIVE_CLASSES = ['bg-white', 'shadow-sm', 'text-slate-900'] as const;
const INACTIVE_CLASS = 'text-slate-600';

export class FilterGroup<V extends string = string> extends Component<FilterGroupProps<V>> {
  private container!: HTMLElement;
  private buttons = new Map<V, HTMLButtonElement>();
  private currentValue: V | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.container = this.$('[data-buttons]');
    const tpl = this.$<HTMLTemplateElement>('template[data-button]');

    for (const item of this.props.items) {
      const node = tpl.content.cloneNode(true) as DocumentFragment;
      const btn = node.querySelector('button') as HTMLButtonElement;
      btn.textContent = item.label;
      btn.dataset.value = item.value;
      btn.classList.add('py-1.5', item.px ?? 'px-4');
      this.container.appendChild(btn);
      this.buttons.set(item.value, btn);
    }

    this.currentValue = this.props.initialValue ?? null;
    if (this.currentValue !== null) this.applyActive(this.currentValue);
  }

  protected bind(): void {
    for (const [value, btn] of this.buttons) {
      this.on(btn, 'click', () => this.handleClick(value));
    }
  }

  setValue(value: V | null): void {
    this.currentValue = value;
    this.applyActive(value);
  }

  private handleClick(value: V): void {
    const next = this.currentValue === value ? null : value;
    this.currentValue = next;
    this.applyActive(next);
    this.props.onChange(next);
  }

  private applyActive(value: V | null): void {
    for (const [v, btn] of this.buttons) {
      const active = v === value;
      btn.classList.toggle(INACTIVE_CLASS, !active);
      for (const c of ACTIVE_CLASSES) btn.classList.toggle(c, active);
    }
  }
}
