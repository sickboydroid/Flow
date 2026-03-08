import { BaseTab } from "./BaseTab";
import template from "./DashboardTab.html?raw";
import "./DashboardTab.css";

export class DashboardTab extends BaseTab {
  constructor() {
    super("dashboard", "Dashboard", "/tab-icons/dashboard.png");
  }

  public render(): string {
    return template;
  }

  public onShow(container: HTMLElement): void {
    super.onShow(container);
    // TODO: Setup listeners etc
    // TODO: Initialize RFID hardware listener here (e.g., listening to global keystrokes or WebSocket)
  }

  public onHide(): void {
    super.onHide();
    // TODO: Clean up RFID listeners when navigating away
  }
}
