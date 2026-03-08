export abstract class BaseTab {
  public id: string;
  public title: string;
  public iconUrl: string;
  protected container: HTMLElement | null = null;

  constructor(id: string, title: string, iconUrl: string) {
    this.id = id;
    this.title = title;
    this.iconUrl = iconUrl;
  }

  public abstract render(): string;

  public onShow(container: HTMLElement): void {
    this.container = container;
    // Overridden by child classes to attach event listeners, fetch data, etc.
  }

  public onHide(): void {
    // Overridden by child classes to clean up intervals, listeners, etc.
    this.container = null;
  }
}
