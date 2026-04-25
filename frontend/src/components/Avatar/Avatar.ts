/**
 * Profile picture wrapper that automatically falls back to ui-avatars
 * when the backend image is missing. The host element controls size
 * and shape — this component only renders the `<img>` and handles the
 * onerror dance.
 */

import { Component } from '../../core/Component';
import { fallbackAvatarUrl, profilePicUrl } from '../../utils/profilePic';
import template from './Avatar.html?raw';

export interface AvatarProps {
  enrollment: string;
  fallbackName: string;
  /** Size hint passed to the fallback service. Useful for sharper big avatars. */
  fallbackSize?: number;
}

export class Avatar extends Component<AvatarProps> {
  private img!: HTMLImageElement;

  protected render(): void {
    this.root.insertAdjacentHTML('beforeend', template);
    this.img = this.$<HTMLImageElement>('[data-img]');
    this.img.src = profilePicUrl(this.props.enrollment);
  }

  protected bind(): void {
    this.on(
      this.img,
      'error',
      () => {
        this.img.onerror = null;
        this.img.src = fallbackAvatarUrl(this.props.fallbackName, this.props.fallbackSize);
      },
      { once: true }
    );
  }
}
