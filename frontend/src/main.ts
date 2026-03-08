import { TabManager } from "./tabs/TabManager";
import { DashboardTab } from "./tabs/DashboardTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { StudentsTab } from "./tabs/StudentsTab";

document.addEventListener("DOMContentLoaded", () => {
  const manager = new TabManager("tab-content", "nav-list");

  // Register all modules
  manager.registerTab(new DashboardTab());
  manager.registerTab(new AnalyticsTab());
  manager.registerTab(new StudentsTab());

  // Set default route
  manager.switchTab("dashboard");
});
