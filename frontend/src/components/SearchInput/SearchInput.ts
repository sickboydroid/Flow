/**
 * Debounced search box. Emits a `search` CustomEvent with the trimmed value.
 *
 * Usage: parent gives a slot div with `relative w-full md:w-72`, then
 * `new SearchInput(slot, { placeholder, onChange }).mount()`.
 */

import { Component } from '../../core/Component';
import { renderIcons } from '../../core/Icons';
import template from './SearchInput.html?raw';

export interface SearchInputProps {
  placeholder: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 350;

export class SearchInput extends Component<SearchInputProps> {
  private input!: HTMLInputElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.input = this.$<HTMLInputElement>('[data-input]');
    this.input.placeholder = this.props.placeholder;
    renderIcons(this.root);
  }

  protected bind(): void {
    const debounce = this.props.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.on(this.input, 'input', () => {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.props.onChange(this.input.value.trim());
      }, debounce);
    });
  }

  override unmount(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    super.unmount();
  }

  setValue(value: string): void {
    this.input.value = value;
  }
}
