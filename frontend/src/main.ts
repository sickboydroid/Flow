/**
 * Application bootstrap.
 *
 * Wires the static shell (`index.html`) to the component tree:
 *   1. Load global styles.
 *   2. Start the decorative space background.
 *   3. Mount the snackbar host so any module can `EventBus.emit('snackbar:show', …)`.
 *   4. Construct the dialog features (they self-append to `#dialog-root`).
 *   5. Construct each page, register it with the router, and mount the nav.
 *   6. Sync `appStore.activeTab` with the router and expose tab switches
 *      via the Router so the legacy `switchTab` is gone.
 *   7. Start the live-timestamp ticker and RFID scanner.
 */

import './styles/globals.css';

import { renderIcons } from './core/Icons';
import { EventBus } from './core/EventBus';
import { Router } from './router/Router';
import { appStore, type TabName } from './store/appStore';
import { Snackbar } from './components/Snackbar/Snackbar';
import { NavBar } from './components/NavBar/NavBar';

import { SpaceBackground } from './background/SpaceBackground';
import { liveTimestampTicker } from './utils/LiveTimestampTicker';
import { Scanner } from './features/Scanner/Scanner';

import { AddEntryDialog } from './features/AddEntryDialog/AddEntryDialog';
import { StudentInfoDialog } from './features/StudentInfoDialog/StudentInfoDialog';
import { VehicleHistoryDialog } from './features/VehicleHistoryDialog/VehicleHistoryDialog';
import { VisitorDetailDialog } from './features/VisitorDetailDialog/VisitorDetailDialog';

import { Dashboard } from './pages/Dashboard/Dashboard';
import { Students } from './pages/Students/Students';
import { Vehicles } from './pages/Vehicles/Vehicles';
import { Visitors } from './pages/Visitors/Visitors';
import { Analytics } from './pages/Analytics/Analytics';

const TABS: readonly TabName[] = ['dashboard', 'students', 'vehicles', 'visitors', 'analytics'];

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`bootstrap: missing #${id}`);
  return el as T;
}

function makePageView(parent: HTMLElement, name: TabName): HTMLElement {
  const view = document.createElement('div');
  view.id = `view-${name}`;
  view.classList.add('w-full', 'h-full', 'min-h-0', 'flex-grow', 'tab-view');
  parent.appendChild(view);
  return view;
}

function boot(): void {
  // Background
  new SpaceBackground(getElement<HTMLCanvasElement>('space-canvas')).start();

  // Snackbar host (lives the full app lifetime)
  new Snackbar(getElement('snackbar-container'), undefined).mount();

  // Dialogs (mount themselves into the dialog root)
  const dialogRoot = getElement('dialog-root');
  const addEntryDialog = new AddEntryDialog(dialogRoot);
  const studentInfoDialog = new StudentInfoDialog(dialogRoot);
  const vehicleHistoryDialog = new VehicleHistoryDialog(dialogRoot);
  const visitorDetailDialog = new VisitorDetailDialog(dialogRoot);

  // Router + per-page view containers
  const appRoot = getElement('app');
  const router = new Router();

  const dashboardView = makePageView(appRoot, 'dashboard');
  const studentsView = makePageView(appRoot, 'students');
  const vehiclesView = makePageView(appRoot, 'vehicles');
  const visitorsView = makePageView(appRoot, 'visitors');
  const analyticsView = makePageView(appRoot, 'analytics');

  const dashboard = new Dashboard(dashboardView, {
    studentInfoDialog,
    vehicleHistoryDialog,
    visitorDetailDialog,
    addEntryDialog,
  });
  const students = new Students(studentsView, { studentInfoDialog });
  const vehicles = new Vehicles(vehiclesView, { vehicleHistoryDialog });
  const visitors = new Visitors(visitorsView, { visitorDetailDialog });
  const analytics = new Analytics(analyticsView, undefined);

  dashboard.mount();
  students.mount();
  vehicles.mount();
  visitors.mount();
  analytics.mount();

  router.register({ name: 'dashboard', view: dashboardView, display: 'flex' });
  router.register({
    name: 'students',
    view: studentsView,
    display: 'flex',
    onEnter: () => students.onEnter(),
    onLeave: () => students.onLeave(),
  });
  router.register({
    name: 'vehicles',
    view: vehiclesView,
    display: 'flex',
    onEnter: () => vehicles.onEnter(),
    onLeave: () => vehicles.onLeave(),
  });
  router.register({
    name: 'visitors',
    view: visitorsView,
    display: 'flex',
    onEnter: () => visitors.onEnter(),
    onLeave: () => visitors.onLeave(),
  });
  router.register({
    name: 'analytics',
    view: analyticsView,
    display: 'flex',
    onEnter: () => analytics.onEnter(),
    onLeave: () => analytics.onLeave(),
  });

  router.onChange((name) => {
    if (TABS.includes(name as TabName)) appStore.setActiveTab(name as TabName);
  });

  // Top nav and initial route
  new NavBar(getElement('nav-root'), { router }).mount();
  router.navigate('dashboard');

  // Cross-cutting: refresh the dashboard's recent-logs whenever any domain
  // log changes, so the "live" feeling extends beyond the active tab.
  EventBus.on('logs:changed', () => {
    void dashboard.refreshRecent();
  });
  EventBus.on('scan:processed', ({ enrollment }) => {
    dashboard.highlightStudent(enrollment);
  });

  // Long-running services
  new Scanner().start();
  liveTimestampTicker.start();

  renderIcons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
