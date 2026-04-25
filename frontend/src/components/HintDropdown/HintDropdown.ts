/**
 * Autocomplete dropdown displayed underneath a text input.
 *
 * The host element is the existing dropdown container (an absolutely
 * positioned div hidden by default). The component owns its visibility
 * and item rendering; the parent feeds it a fresh hint list each time
 * the input changes.
 */

import { Component } from '../../core/Component';
import template from './HintDropdown.html?raw';

export interface HintDropdownProps {
  onPick: (value: string) => void;
}

export class HintDropdown extends Component<HintDropdownProps> {
  private itemTpl!: HTMLTemplateElement;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.itemTpl = this.$<HTMLTemplateElement>('template[data-item]');
  }

  show(items: string[]): void {
    this.clearItems();
    if (items.length === 0) {
      this.hide();
      return;
    }
    for (const value of items) {
      const node = this.itemTpl.content.cloneNode(true) as DocumentFragment;
      const btn = node.querySelector('button') as HTMLButtonElement;
      btn.textContent = value;
      this.on(btn, 'click', () => {
        this.props.onPick(value);
        this.hide();
      });
      this.root.appendChild(btn);
    }
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private clearItems(): void {
    for (const child of Array.from(this.root.children)) {
      if (child !== this.itemTpl) child.remove();
    }
  }
}
