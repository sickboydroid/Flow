import { BaseTab } from "./BaseTab";
import template from "./AnalyticsTab.html?raw";
import "./AnalyticsTab.css";

export class AnalyticsTab extends BaseTab {
  constructor() {
    super("analytics", "Analytics", "/tab-icons/analytics.png");
  }

  public render(): string {
    return template;
  }

  public onShow(container: HTMLElement): void {
    super.onShow(container);
  }

  public onHide(): void {
    super.onHide();
    // Clean up any charts or polling intervals here if added later
  }
}
