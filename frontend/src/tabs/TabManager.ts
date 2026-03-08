import { BaseTab } from "./BaseTab";

export class TabManager {
  private tabs: Map<string, BaseTab> = new Map();
  private activeTabId: string | null = null;
  private contentContainer: HTMLElement;
  private navContainer: HTMLElement;

  constructor(contentContainerId: string, navContainerId: string) {
    this.contentContainer = document.getElementById(contentContainerId)!;
    this.navContainer = document.getElementById(navContainerId)!;
  }

  public registerTab(tab: BaseTab): void {
    this.tabs.set(tab.id, tab);
    this.createNavItem(tab);
  }

  public async switchTab(tabId: string): Promise<void> {
    if (this.activeTabId === tabId) return;

    const newTab = this.tabs.get(tabId);
    if (!newTab) throw new Error(`Tab ${tabId} not found`);

    if (this.activeTabId) {
      const currentTab = this.tabs.get(this.activeTabId);
      currentTab?.onHide();
      await this.animateOut();
    }

    this.activeTabId = tabId;
    this.updateNavState();

    this.contentContainer.innerHTML = `<div class="tab-pane fade-in">${newTab.render()}</div>`;

    requestAnimationFrame(() => {
      this.animateIn();
      const pane = this.contentContainer.querySelector(
        ".tab-pane",
      ) as HTMLElement;
      newTab.onShow(pane);
    });
  }

  private createNavItem(tab: BaseTab): void {
    const li = document.createElement("li");
    li.className = "nav-item";
    li.dataset.target = tab.id;

    // Create the icon image element
    const icon = document.createElement("img");
    icon.src = tab.iconUrl;
    icon.alt = ""; // Decorative image, keep alt empty
    icon.className = "nav-icon";

    // Create a text node for the tab title
    const text = document.createTextNode(tab.title);

    // Append both to the list item
    li.appendChild(icon);
    li.appendChild(text);

    li.addEventListener("click", () => this.switchTab(tab.id));
    this.navContainer.appendChild(li);
  }

  private updateNavState(): void {
    const items = this.navContainer.querySelectorAll(".nav-item");
    items.forEach((item) => {
      if ((item as HTMLElement).dataset.target === this.activeTabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  private animateOut(): Promise<void> {
    return new Promise((resolve) => {
      const pane = this.contentContainer.querySelector(".tab-pane");
      if (!pane) return resolve();

      pane.classList.add("fade-out");
      pane.addEventListener("transitionend", () => resolve(), { once: true });
    });
  }

  private animateIn(): void {
    const pane = this.contentContainer.querySelector(".tab-pane");
    if (pane) {
      pane.classList.remove("fade-in");
    }
  }
}
