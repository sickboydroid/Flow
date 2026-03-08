import { BaseTab } from "./BaseTab";
import template from "./StudentsTab.html?raw";
import "./StudentsTab.css";

export class StudentsTab extends BaseTab {
  constructor() {
    super("students", "Students", "/tab-icons/students.png");
  }

  public render(): string {
    return template;
  }

  public onShow(container: HTMLElement): void {
    super.onShow(container);
  }

  public onHide(): void {}
}
