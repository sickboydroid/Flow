/**
 * Lightweight controller around a native `<dialog>` element.
 *
 * Used by every feature dialog to centralize:
 *   - open / close
 *   - pause RFID scanning while open (via appStore)
 *   - close-on-backdrop click
 *   - open / close hooks consumed by subclasses
 *
 * Each feature provides its own `<dialog>` template; this class only
 * manages behavior, never markup.
 */

import { appStore } from '../../store/appStore';

export interface DialogOptions {
  /** Pause RFID scanning while the dialog is open. Defaults to true. */
  pauseScanning?: boolean;
  /** Close the dialog when the backdrop (outside content) is clicked. Defaults to true. */
  closeOnBackdrop?: boolean;
}

export class DialogController {
  protected readonly dialog: HTMLDialogElement;
  private opts: Required<DialogOptions>;
  private boundClose: () => void;
  private boundBackdrop: (e: MouseEvent) => void;

  constructor(dialog: HTMLDialogElement, options: DialogOptions = {}) {
    this.dialog = dialog;
    this.opts = {
      pauseScanning: options.pauseScanning ?? true,
      closeOnBackdrop: options.closeOnBackdrop ?? true,
    };
    this.boundClose = (): void => this.handleClose();
    this.boundBackdrop = (e: MouseEvent): void => this.handleBackdrop(e);
    this.dialog.addEventListener('close', this.boundClose);
    if (this.opts.closeOnBackdrop) this.dialog.addEventListener('click', this.boundBackdrop);
  }

  open(): void {
    if (this.dialog.open) return;
    if (this.opts.pauseScanning) appStore.setAcceptingScans(false);
    this.dialog.showModal();
    this.onOpen();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  isOpen(): boolean {
    return this.dialog.open;
  }

  /** Subscribe to the dialog being closed (via close button, ESC, backdrop). */
  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  /** Subclass hook fired immediately after the dialog opens. */
  protected onOpen(): void {}

  destroy(): void {
    this.dialog.removeEventListener('close', this.boundClose);
    this.dialog.removeEventListener('click', this.boundBackdrop);
    this.closeHandlers = [];
  }

  private closeHandlers: Array<() => void> = [];

  private handleClose(): void {
    if (this.opts.pauseScanning) appStore.setAcceptingScans(true);
    for (const h of this.closeHandlers) h();
  }

  private handleBackdrop(e: MouseEvent): void {
    // Native <dialog> reports clicks on the backdrop as clicks on the dialog
    // element itself (since the backdrop is a pseudo-element). Inner content
    // clicks bubble from descendants.
    if (e.target === this.dialog) this.close();
  }
}
