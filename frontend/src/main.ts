import './styles/style.css';
import './space';
import { createIcons, LayoutDashboard, List, BarChart2, Plus, ArrowDown, History, UserX, X, Search, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide';
import { api } from './api/client';
import type { StudentInfo, StudentLog } from './api/client';
import { showSnackbar } from './utils/snackbar';

// Application State
let recentLogs: StudentLog[] = [];
let lastScannedStudent: StudentInfo | null = null;
let lastScannedStatus: 'IN' | 'OUT' | 'LEAVE' | 'NO ACTIVITY' | null = null;
let isAcceptingScans = true;
let activeTab = 'dashboard';

// Logs Tab State
let currentLogsOffset = 0;
const logsLimit = 20;
let logsSearchQuery = '';
let selectedRoles: string[] = [];
let selectedGenders: string[] = [];
let selectedStatuses: string[] = [];
let logsTotalCount = 0;

// Initialize layout icons
createIcons({
  icons: { LayoutDashboard, List, BarChart2, Plus, ArrowDown, History, UserX, X, Search, Loader2, ArrowLeft, ArrowRight, Check },
  nameAttr: 'data-lucide',
});

// UI Elements
const recentLogsContainer = document.getElementById('recent-logs-container')!;
const lastScannedContainer = document.getElementById('last-scanned-container')!;
const addEntryBtn = document.getElementById('add-entry-btn')!;
const manualEntryDialog = document.getElementById('manual-entry-dialog') as HTMLDialogElement;
const studentInfoDialog = document.getElementById('student-info-dialog') as HTMLDialogElement;
const manualEntryForm = document.getElementById('manual-entry-form') as HTMLFormElement;

// Valid RFIDs mock pool (as per instructions)
const validRfids = [
  "0xED89DE79", // index 0 (Alt+0 placeholder)
  "0x212F54D6", // Alt+1 (Junaid)
  "0x7D91AFAE", // Alt+2 (Shahid)
  "0xCFE5AEFC", // Alt+3 (Mudassir)
  "0xAEBCB5CE", // Alt+4 (Haleem)
  "0xA66FA610", // Alt+5 (Sohaib)
  "0xC7AC17FD","0x6AB8D9EA","0xFEEECF11","0xBF1F200A"
];

async function init() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { logs } = await api.getLogs({ limit: 20, denied: false, after: oneHourAgo });
    recentLogs = logs;
    renderLogs();
    
    if (logs.length > 0) {
      // Pick the top one as last scanned
      const last = logs[0];
      const info = await api.getStudentInfo(last.enrollment);
      if (info) {
        lastScannedStudent = info;
        lastScannedStatus = last.status;
        renderLastScanned();
      }
    }
  } catch (e) {
    console.error(e);
    recentLogsContainer.innerHTML = `<div class="flex flex-col items-center text-red-400 gap-2 m-auto mt-10"><p class="text-sm">Failed to load logs</p></div>`;
  }
}

function renderLogs() {
  const subtitle = document.getElementById('recent-logs-subtitle')!;
  
  if (recentLogs.length === 0) {
    subtitle.classList.add('hidden');
    recentLogsContainer.innerHTML = `
      <div class="flex justify-center items-center h-full text-slate-400">
        <div class="flex flex-col items-center gap-2 pt-10">
          <i data-lucide="history" class="w-8 h-8 opacity-50"></i>
          <p class="text-sm">No recent logs</p>
        </div>
      </div>
    `;
    createIcons({ icons: { History }, nameAttr: 'data-lucide', root: recentLogsContainer });
    return;
  }

  const uniqueStudents = new Set(recentLogs.map(l => l.enrollment)).size;
  subtitle.textContent = `${uniqueStudents} students in the last hour`;
  subtitle.classList.remove('hidden');

  // Group to find latest log of each student
  const latestLogPerStudent = new Map<string, string>(); // enroll -> logId
  for (const log of recentLogs) {
    if (!latestLogPerStudent.has(log.enrollment)) {
      latestLogPerStudent.set(log.enrollment, log._id);
    }
  }

  const rowsHtml = recentLogs.map((log) => {
    const isLatest = latestLogPerStudent.get(log.enrollment) === log._id;
    const isOut = log.status === 'OUT';
    const isLeave = log.status === 'LEAVE';
    const statusColor = isLeave ? 'bg-blue-400' : isOut ? 'bg-amber-500' : 'bg-emerald-500';
    const timeStr = timeSince(log.timestamp as string);
    const studentName = log.student ? `${log.student.firstName} ${log.student.lastName}` : 'Unknown';
    const gender = log.student?.gender || 'Unknown';
    const role = log.student?.isHosteller ? 'Hosteller' : 'Day-Scholar';
    const rowClass = "flex items-center justify-between p-3.5 border-b border-slate-100 hover:bg-slate-100/50 cursor-pointer even:bg-slate-50 transition-colors";
    
    return `
      <div class="${rowClass}" data-log-enroll="${log.enrollment}">
        <div class="flex items-center gap-3.5 overflow-hidden">
          <div class="w-11 h-11 rounded-full overflow-hidden bg-slate-200 shadow-sm shrink-0 ring-2 ring-slate-100/50">
              <img src="http://localhost:5000/profilepics/${log.enrollment.toLowerCase()}.jpg" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${studentName}&background=random'" />
          </div>
          <div class="min-w-0 flex flex-col justify-center">
            <div class="flex items-center gap-2 mb-0.5">
              <h4 class="text-[15px] font-medium text-slate-800 truncate tracking-tight">${studentName}</h4>
              <span class="w-2 h-2 rounded-full shadow-sm ${statusColor}" title="${log.status}"></span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span class="font-mono text-slate-400 font-semibold tracking-wider text-xs">${log.enrollment}</span>
              <div class="flex items-center gap-1.5 ml-1">
                <span class="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-slate-500 capitalize leading-none shadow-sm">${gender}</span>
                <span class="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-slate-500 leading-none shadow-sm">${role}</span>
                ${log.denied ? `<span class="px-1.5 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-600 font-bold uppercase leading-none shadow-sm">Denied</span>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0 pl-3">
          <span class="text-xs font-semibold text-slate-400 tracking-wide" data-live-timestamp="${log.timestamp}">${timeStr} <span class="font-normal opacity-70">ago</span></span>
          <div class="flex items-center justify-end min-w-[32px]">
            ${isLatest ? `
            <button class="deny-log-btn cursor-pointer p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full border border-transparent hover:border-red-100 transition-all focus:outline-none focus:ring-2 focus:ring-red-100 shadow-sm bg-white" data-id="${log._id}" data-enroll="${log.enrollment}" title="Deny Entry">
              <i data-lucide="x" class="w-[16px] h-[16px] pointer-events-none"></i>
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  recentLogsContainer.innerHTML = `
    <div class="flex flex-col w-full h-full min-w-[400px]">
      ${rowsHtml}
    </div>
  `;
  
  createIcons({ icons: { History, X }, nameAttr: 'data-lucide', root: recentLogsContainer });

  // Attach deny events
  document.querySelectorAll('.deny-log-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id!;
      const enroll = (btn as HTMLElement).dataset.enroll!;
      await handleDenyLog(id, enroll);
    });
  });

  // Attach info events
  document.querySelectorAll('[data-log-enroll]').forEach(el => {
    el.addEventListener('click', () => {
      const enroll = (el as HTMLElement).dataset.logEnroll!;
      openStudentInfo(enroll);
    });
  });
}

function renderLastScanned() {
  if (!lastScannedStudent) {
    lastScannedContainer.innerHTML = `
      <div class="flex flex-col items-center text-slate-400 gap-3">
        <i data-lucide="user-x" class="w-12 h-12 opacity-50"></i>
        <p class="text-sm">No recent scans</p>
      </div>
    `;
    createIcons({ icons: { UserX }, nameAttr: 'data-lucide', root: lastScannedContainer });
    return;
  }

  const statusColor = lastScannedStatus === 'IN'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : lastScannedStatus === 'LEAVE'
    ? 'bg-blue-50 text-blue-700 ring-blue-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200';

  lastScannedContainer.innerHTML = `
    <div class="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
      <div class="relative mb-5">
        <img src="http://localhost:5000/profilepics/${lastScannedStudent.enrollment.toLowerCase()}.jpg" class="w-36 h-36 rounded-full object-cover shadow-md border-4 border-white" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${lastScannedStudent.firstName}&background=random'" />
      </div>
      <h3 class="text-xl font-bold text-slate-900 font-outfit mb-1">${lastScannedStudent.firstName} ${lastScannedStudent.lastName}</h3>
      <p class="text-sm font-medium text-slate-500 mb-4">${lastScannedStudent.enrollment}</p>
      <div class="flex flex-wrap justify-center items-center gap-3 mb-6">
        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
          ${lastScannedStudent.isHosteller ? 'Hosteller' : 'Day Scholar'}
        </span>
        <span class="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ring-1 shadow-sm ${statusColor}">
          Currently ${lastScannedStatus}
        </span>
      </div>
      <div class="w-full max-w-sm mt-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100/50">
        <div class="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-slate-600">
          <div>
            <span class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Branch</span>
            <span class="font-medium text-slate-700">${lastScannedStudent.branch || 'Unknown'}</span>
          </div>
          <div>
            <span class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Phone Number</span>
            <span class="font-medium text-slate-700">${lastScannedStudent.phoneNumber || 'N/A'}</span>
          </div>
          <div>
            <span class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Year</span>
            <span class="font-medium text-slate-700">${lastScannedStudent.year || 'Unknown'}</span>
          </div>
          <div>
            <span class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Gender</span>
            <span class="font-medium text-slate-700 capitalize">${lastScannedStudent.gender || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Logic implementations
async function scanRfid(rfid: string) {
  if (!isAcceptingScans || activeTab !== 'dashboard') return;

  const enroll = await api.isValidRfid(rfid);
  if (!enroll) {
    showSnackbar('Invalid RFID Card', 'error');
    return;
  }
  await processScan(enroll);
}

async function processScan(enroll: string) {
  // Prevent duplicate scan in 30 seconds
  const lastLog = recentLogs.find(l => l.enrollment === enroll);
  if (lastLog && lastLog.timestamp) {
    const diff = new Date().getTime() - new Date(lastLog.timestamp).getTime();
    if (diff < 10000 && !lastLog.denied) {
      showSnackbar('Scanned too quickly. Please wait.', 'error');
      return;
    }
  }

  // Update backend status natively (this flips status and creates log on backend)
  const success = await api.updateStudentStatus(enroll);
  if (!success) {
    showSnackbar('Failed to update status', 'error');
    return;
  }

  // Fetch updated student info and fetch the newly added logs
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [info, logsRes] = await Promise.all([
    api.getStudentInfo(enroll),
    api.getLogs({ limit: 20, denied: false, after: oneHourAgo }) // Refresh logs visually
  ]);

  if (info && logsRes.logs.length > 0) {
    recentLogs = logsRes.logs;
    lastScannedStudent = info;
    const currentLog = logsRes.logs.find(l => l.enrollment === enroll);
    lastScannedStatus = currentLog ? currentLog.status : 'IN';
    
    renderLogs();
    renderLastScanned();
    showSnackbar(`Successfully scanned ${info.firstName}`, 'success');
  }
}

async function handleDenyLog(logId: string, enroll: string) {
  const log = recentLogs.find(l => l._id === logId);
  if (!log) return;

  const success = await api.updateLog(enroll, logId, true, log.status, new Date().toISOString());
  if (success) {
    showSnackbar('Log entry denied', 'success');
    // Refresh
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const logsRes = await api.getLogs({ limit: 20, denied: false, after: oneHourAgo });
    recentLogs = logsRes.logs;
    renderLogs();
    // If it was the last scanned student, visually update it somehow.
    if (lastScannedStudent && lastScannedStudent.enrollment === enroll) {
      lastScannedContainer.innerHTML = '';
      lastScannedStudent = null;
      renderLastScanned();
    }
  } else {
    showSnackbar('Failed to deny entry', 'error');
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 mins';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  if (years > 0) return `${years}y ${months % 12}mo`;
  if (months > 0) return `${months}mo ${days % 30}d`;
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

function formatDate(d: string | Date | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Student info dialog state
let siEnroll = '';
let siOffset = 0;
const siLimit = 50;

async function renderStudentLogsTable(enroll: string, offset: number) {
  const tableBody = document.getElementById('si-logs-tbody')!;
  const pageIndicator = document.getElementById('si-page-indicator')!;
  const totalIndicator = document.getElementById('si-total-logs')!;
  const prevBtn = document.getElementById('si-prev-btn') as HTMLButtonElement;
  const nextBtn = document.getElementById('si-next-btn') as HTMLButtonElement;

  tableBody.innerHTML = `<tr><td colspan="4" class="py-10 text-center"><div class="flex justify-center"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>`;

  const { logs, totalCount } = await api.getStudentLogs(enroll, siLimit, offset);

  const maxPage = Math.max(1, Math.ceil(totalCount / siLimit));
  const currentPage = Math.floor(offset / siLimit) + 1;
  pageIndicator.textContent = `Page ${currentPage} / ${maxPage}`;
  totalIndicator.textContent = `${totalCount} total logs`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === maxPage;

  if (logs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="py-10 text-center text-slate-400 italic text-sm">No logs found for this student</td></tr>`;
    return;
  }

  tableBody.innerHTML = logs.map((log: any, i: number) => {
    const type = log.type || 'IN';
    const typeColor = type === 'IN' ? 'text-emerald-600 bg-emerald-50' : type === 'LEAVE' ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50';
    const date = log.timestamp ? new Date(log.timestamp) : null;
    const dateStr = date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
    const timeStr = date ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

    // Duration = time until the NEXT log (logs are sorted newest-first, so next in array is older)
    // i === 0 is the most recent log on this page, and if we're on page 1 it's the most recent overall
    const isFirstOnPage = i === 0;
    const nextLog = logs[i + 1]; // next in list is the chronologically OLDER entry
    let durationStr: string;
    if (isFirstOnPage && offset === 0) {
      // Most recent log: state is still ongoing
      durationStr = '<span class="text-blue-500 font-semibold">Ongoing</span>';
    } else if (nextLog && nextLog.timestamp && log.timestamp) {
      // Duration = current log timestamp - next (older) log timestamp
      const ms = new Date(log.timestamp).getTime() - new Date(nextLog.timestamp).getTime();
      durationStr = formatDuration(Math.abs(ms));
    } else {
      durationStr = '—';
    }

    return `
      <tr class="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
        <td class="px-5 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">${timeStr}</td>
        <td class="px-5 py-3">
          <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColor}">${type}</span>
          ${log.denied ? '<span class="ml-1.5 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-red-600 bg-red-50">Denied</span>' : ''}
          ${log.mode_of_entry === 'MANUAL' ? '<span class="ml-1.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 bg-slate-100">Manual</span>' : ''}
        </td>
        <td class="px-5 py-3 text-sm text-slate-400 text-right whitespace-nowrap">${durationStr}</td>
      </tr>`;
  }).join('');
}

async function openStudentInfo(enroll: string) {
  isAcceptingScans = false;
  siEnroll = enroll;
  siOffset = 0;

  const content = document.getElementById('student-info-content')!;
  studentInfoDialog.showModal();

  // Shimmer skeleton
  content.innerHTML = `
    <div class="p-6 space-y-5 animate-pulse">
      <div class="flex gap-6">
        <div class="w-28 h-28 rounded-2xl bg-slate-200 shrink-0"></div>
        <div class="flex-1 space-y-3 pt-2">
          <div class="h-5 bg-slate-200 rounded w-2/3"></div>
          <div class="h-3.5 bg-slate-200 rounded w-1/3"></div>
          <div class="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${[1,2,3,4,5,6].map(() => `<div class="h-16 bg-slate-200 rounded-xl"></div>`).join('')}
      </div>
      <div class="h-48 bg-slate-200 rounded-xl"></div>
    </div>`;

  const [info, stats] = await Promise.all([
    api.getStudentInfo(enroll),
    api.getStudentStats(enroll)
  ]);

  if (!info) {
    content.innerHTML = `<div class="flex flex-col items-center gap-2 p-10 text-red-400"><p class="font-medium">Failed to load student info</p></div>`;
    return;
  }

  // Compact 4-stat summary row
  const rangeFrom = stats?.firstLogDate ? formatDate(stats.firstLogDate) : null;
  const rangeTo = stats?.lastActiveDate ? formatDate(stats.lastActiveDate) : null;
  const rangeLabel = rangeFrom ? `${rangeFrom} &ndash; ${rangeTo ?? 'now'}` : '';

  const statCards = [
    { label: 'Total Logs', value: stats?.totalLogs ?? 0, sub: '', accent: 'text-slate-700' },
    { label: 'Time Inside', value: stats?.totalInDuration ? formatDuration(stats.totalInDuration) : '—', sub: `${stats?.totalIn ?? 0} entries`, accent: 'text-emerald-600' },
    { label: 'Time Outside', value: stats?.totalOutDuration ? formatDuration(stats.totalOutDuration) : '—', sub: `${stats?.totalOut ?? 0} exits`, accent: 'text-amber-600' },
    { label: 'Time on Leave', value: stats?.totalLeaveDuration ? formatDuration(stats.totalLeaveDuration) : '—', sub: `${stats?.totalLeave ?? 0} leaves`, accent: 'text-blue-600' },
  ].map(c => `
    <div class="bg-white border border-slate-100 rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
      <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400">${c.label}</span>
      <span class="text-base font-bold ${c.accent} leading-tight">${c.value}</span>
      ${c.sub ? `<span class="text-[10px] text-slate-400">${c.sub}</span>` : ''}
    </div>`).join('');

  content.innerHTML = `
    <!-- Top Profile Section -->
    <div class="p-6 border-b border-slate-100 bg-white">
      <div class="flex gap-6 items-start">
        <!-- Profile Pic -->
        <div class="shrink-0">
          <img src="http://localhost:5000/profilepics/${info.enrollment.toLowerCase()}.jpg"
            class="w-28 h-28 rounded-2xl object-cover shadow-md border-4 border-white ring-1 ring-slate-100"
            onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(info.firstName)}&background=random&size=112'" />
        </div>
        <!-- Name & Quick Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 class="text-2xl font-bold text-slate-900 font-outfit leading-tight">${info.firstName} ${info.lastName}</h2>
              <p class="text-sm font-mono text-slate-400 mt-0.5">${info.enrollment}</p>
            </div>
          </div>
          <!-- Detail fields -->
          <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Branch</span><span class="font-medium text-slate-700">${info.branch || 'N/A'}</span></div>
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Year</span><span class="font-medium text-slate-700">${info.year || 'N/A'}</span></div>
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Gender</span><span class="font-medium text-slate-700 capitalize">${info.gender || 'N/A'}</span></div>
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Role</span><span class="font-medium text-slate-700">${info.isHosteller ? 'Hosteller' : 'Day Scholar'}</span></div>
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Contact</span><span class="font-medium text-slate-700">${info.phoneNumber || 'Not Provided'}</span></div>
            <div><span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Address</span><span class="font-medium text-slate-700 truncate block max-w-[200px]" title="${info.address || ''}">${info.address || 'N/A'}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="px-6 py-3 border-b border-slate-100 bg-slate-50/60">
      <div class="flex items-baseline gap-2 mb-2">
        <h4 class="text-xs uppercase tracking-widest text-slate-400 font-semibold">Activity Summary</h4>
        ${rangeLabel ? `<span class="text-[11px] text-slate-400">(${rangeLabel})</span>` : ''}
      </div>
      <div class="grid grid-cols-4 gap-2.5">${statCards}</div>
    </div>

    <!-- Logs Table Section -->
    <div class="flex flex-col flex-grow">
      <div class="px-6 pt-5 pb-3">
        <h4 class="text-xs uppercase tracking-widest text-slate-400 font-semibold">Log History</h4>
      </div>
      <div class="flex-grow overflow-hidden">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Time</th>
              <th class="px-5 py-3">Type</th>
              <th class="px-5 py-3 text-right">Duration</th>
            </tr>
          </thead>
          <tbody id="si-logs-tbody">
            <tr><td colspan="4" class="py-10 text-center"><div class="flex justify-center"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div></td></tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination Footer -->
      <div class="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <button id="si-prev-btn" class="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
          </button>
          <span class="text-sm font-medium text-slate-600" id="si-page-indicator">Page 1 / 1</span>
          <button id="si-next-btn" class="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
        </div>
        <span class="text-sm text-slate-400" id="si-total-logs"></span>
      </div>
    </div>
  `;

  // Re-initialize icons inside the dialog
  createIcons({ icons: { ArrowLeft, ArrowRight }, nameAttr: 'data-lucide', root: content });

  // Attach pagination events
  document.getElementById('si-prev-btn')!.addEventListener('click', async () => {
    siOffset = Math.max(0, siOffset - siLimit);
    await renderStudentLogsTable(siEnroll, siOffset);
  });
  document.getElementById('si-next-btn')!.addEventListener('click', async () => {
    siOffset += siLimit;
    await renderStudentLogsTable(siEnroll, siOffset);
  });

  // Load first page of logs
  await renderStudentLogsTable(enroll, 0);
}

document.querySelectorAll('.close-dialog-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    manualEntryDialog.close();
    studentInfoDialog.close();
    isAcceptingScans = true; 
  });
});

// Manual entry
const enrollInput = document.getElementById('enrollment-input') as HTMLInputElement;
const submitBtn = document.getElementById('manual-entry-submit-btn') as HTMLButtonElement;
const enrollStatusIcon = document.getElementById('enrollment-status-icon')!;
const enrollCheckingIcon = document.getElementById('enroll-checking-icon')!;
const enrollValidIcon = document.getElementById('enroll-valid-icon')!;
const enrollInvalidIcon = document.getElementById('enroll-invalid-icon')!;
const entryPreview = document.getElementById('entry-student-preview')!;
const markOnLeaveCheckbox = document.getElementById('mark-on-leave') as HTMLInputElement;

let enrollCheckTimeout: any;
let currentValidEnroll: string | null = null;

function setEnrollState(state: 'idle' | 'checking' | 'valid' | 'invalid') {
  // Status icon in input field
  enrollStatusIcon.classList.toggle('hidden', state === 'idle' || state === 'checking');
  enrollCheckingIcon.classList.toggle('hidden', state !== 'checking');
  enrollValidIcon.classList.toggle('hidden', state !== 'valid');
  enrollInvalidIcon.classList.toggle('hidden', state !== 'invalid');

  // The preview block hides only when idle (empty input)
  entryPreview.classList.toggle('hidden', state === 'idle');

  if (state === 'checking') {
    // Shimmer loading state — no jumping, fixed height
    entryPreview.innerHTML = `
      <div class="flex items-center gap-3 p-3">
        <div class="w-10 h-10 rounded-full bg-slate-200 shrink-0 shimmer"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3.5 bg-slate-200 rounded shimmer w-2/3"></div>
          <div class="h-3 bg-slate-200 rounded shimmer w-1/2"></div>
        </div>
      </div>
    `;
  } else if (state === 'valid') {
    // Populated below by the caller
  } else if (state === 'invalid') {
    entryPreview.innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-red-50">
        <div class="w-10 h-10 rounded-full bg-red-100 shrink-0 flex items-center justify-center">
          <i data-lucide="user-x" class="w-5 h-5 text-red-400 pointer-events-none"></i>
        </div>
        <div>
          <p class="text-sm font-semibold text-red-600">Not Found</p>
          <p class="text-xs text-red-400">No student with this enrollment number</p>
        </div>
      </div>
    `;
    createIcons({ icons: { UserX }, nameAttr: 'data-lucide', root: entryPreview });
  }

  submitBtn.disabled = state !== 'valid';
  // Note: currentValidEnroll is managed by the caller, NOT here
}

enrollInput.addEventListener('input', () => {
  clearTimeout(enrollCheckTimeout);
  const val = enrollInput.value.trim();
  if (!val) {
    currentValidEnroll = null;
    setEnrollState('idle');
    return;
  }
  currentValidEnroll = null;
  setEnrollState('checking');
  enrollCheckTimeout = setTimeout(async () => {
    const info = await api.getStudentInfo(val);
    if (info) {
      currentValidEnroll = info.enrollment;
      setEnrollState('valid');
      entryPreview.innerHTML = `
        <div class="flex items-center gap-3 p-3 bg-emerald-50">
          <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0">
            <img src="http://localhost:5000/profilepics/${info.enrollment.toLowerCase()}.jpg"
              class="w-full h-full object-cover"
              onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(info.firstName)}&background=random'" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">${info.firstName} ${info.lastName}</p>
            <p class="text-xs text-slate-500 truncate">${info.enrollment} &middot; ${info.isHosteller ? 'Hosteller' : 'Day Scholar'} &middot; ${info.gender || 'Unknown'}</p>
          </div>
        </div>
      `;
    } else {
      currentValidEnroll = null;
      setEnrollState('invalid');
    }
  }, 400);
});

addEntryBtn.addEventListener('click', () => {
  isAcceptingScans = false;
  manualEntryForm.reset();
  setEnrollState('idle');
  manualEntryDialog.showModal();
});

manualEntryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentValidEnroll) return;

  const isLeave = markOnLeaveCheckbox.checked;
  const logType: 'IN' | 'OUT' | 'LEAVE' = isLeave ? 'LEAVE' : 'IN';

  manualEntryDialog.close();
  isAcceptingScans = true;

  const success = await api.addManualLog(currentValidEnroll, logType);
  if (success) {
    showSnackbar(`Entry added for student (${isLeave ? 'LEAVE' : 'IN'})`, 'success');
    // Refresh the recent logs panel
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const logsRes = await api.getLogs({ limit: 20, denied: false, after: oneHourAgo });
    recentLogs = logsRes.logs;
    renderLogs();
  } else {
    showSnackbar('Failed to add entry', 'error');
  }
});

// Keyboard shortcuts for mock scanning
window.addEventListener('keydown', (e) => {
  // Alt + 0-9
  if (e.altKey && e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    const index = parseInt(e.key);
    // Grab mock RFID
    simulateScan(validRfids[index] || validRfids[0]);
  }
});

function simulateScan(rfid: string) {
  if (activeTab !== 'dashboard') {
    showSnackbar('Switch back to Dashboard to scan', 'info');
    return;
  }
  if (!isAcceptingScans) {
    showSnackbar('Scanning is paused', 'info');
    return;
  }
  scanRfid(rfid);
}

// -------------------------------------------------------------
// Logs Tab Logic
// -------------------------------------------------------------

function timeSince(dateString: string | null): string {
    if (!dateString) return "-";
    const then = new Date(dateString).getTime();
    const now = Date.now();
    const MathAbs = Math.abs(now - then);
    const diffInSeconds = Math.floor(MathAbs / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} secs`;
    const diffInMins = Math.floor(diffInSeconds / 60);
    if (diffInMins < 60) return `${diffInMins} mins`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ${diffInMins % 60} mins`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ${diffInHours % 24} hrs`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ${diffInDays % 30} days`;
}

async function loadLogsTab() {
  const tableBody = document.getElementById('logs-table-body')!;
  const loader = document.getElementById('logs-loading-indicator')!;
  
  loader.classList.remove('hidden');
  
  try {
    const res = await api.getLogs({
      limit: logsLimit,
      offset: currentLogsOffset,
      unique: true,
      search: logsSearchQuery,
      roles: selectedRoles.join(','),
      genders: selectedGenders.join(','),
      statuses: selectedStatuses.join(',')
    });

    logsTotalCount = res.totalCount;
    // Update pagination
    const maxPage = Math.max(1, Math.ceil(logsTotalCount / logsLimit));
    const currentPage = Math.floor(currentLogsOffset / logsLimit) + 1;
    document.getElementById('logs-page-indicator')!.textContent = `Page: ${currentPage}/${maxPage}`;
    document.getElementById('logs-total-count')!.textContent = logsTotalCount.toString();
    
    (document.getElementById('logs-prev-btn') as HTMLButtonElement).disabled = (currentPage === 1);
    (document.getElementById('logs-next-btn') as HTMLButtonElement).disabled = (currentPage === maxPage);

    if (res.logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">No students match the current filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = res.logs.map(log => {
      const isOut = log.status === 'OUT';
      const isLeave = log.status === 'LEAVE';
      const statusColor = log.status === 'NO ACTIVITY' ? 'text-slate-400' : isLeave ? 'text-blue-600' : isOut ? 'text-amber-600' : 'text-emerald-600';
      const timeStr = log.status === 'NO ACTIVITY' ? '-' : timeSince(log.timestamp as string);
      const studentName = log.student ? `${log.student.firstName} ${log.student.lastName}` : 'Unknown';
      const gender = log.student?.gender || 'Unknown';

      return `
        <tr class="even:bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 cursor-pointer" data-logtab-enroll="${log.enrollment}">
          <td class="py-3 px-4">
             <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shadow-sm mx-auto">
               <img src="http://localhost:5000/profilepics/${log.enrollment.toLowerCase()}.jpg" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${studentName}&background=random'" />
             </div>
          </td>
          <td class="py-3 px-4 font-mono text-[13px] text-slate-500">${log.enrollment}</td>
          <td class="py-3 px-4 font-medium text-slate-800">${studentName}</td>
          <td class="py-3 px-4 text-slate-500 capitalize">${gender}</td>
          <td class="py-3 px-4 font-semibold ${statusColor}">${log.status}</td>
          <td class="py-3 px-4 text-right text-slate-500 font-medium" data-live-timestamp="${log.timestamp}">${timeStr}</td>
        </tr>
      `;
    }).join('');

    // Attach click for opening student info
    document.querySelectorAll('[data-logtab-enroll]').forEach(el => {
      el.addEventListener('click', () => {
        const enroll = (el as HTMLElement).dataset.logtabEnroll!;
        openStudentInfo(enroll);
      });
    });

  } catch (error) {
    console.error("Failed to load logs tab", error);
    tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">Failed to load data.</td></tr>`;
  } finally {
    loader.classList.add('hidden');
  }
}

// Attach Pagination
document.getElementById('logs-prev-btn')!.addEventListener('click', () => {
  if (currentLogsOffset >= logsLimit) {
    currentLogsOffset -= logsLimit;
    loadLogsTab();
  }
});
document.getElementById('logs-next-btn')!.addEventListener('click', () => {
  if ((currentLogsOffset + logsLimit) < logsTotalCount) {
    currentLogsOffset += logsLimit;
    loadLogsTab();
  }
});

// Attach Search
let searchTimeout: any;
const searchInput = document.getElementById('logs-search-input') as HTMLInputElement;
if(searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      logsSearchQuery = (e.target as HTMLInputElement).value;
      // Searching forces offset back to 0 as fuzzy matches top N
      currentLogsOffset = 0;
      loadLogsTab();
    }, 400); // debounce 400ms
  });
}

// Attach Filters
document.querySelectorAll('.logs-filter-group button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const button = e.currentTarget as HTMLElement;
    const group = button.closest('.logs-filter-group') as HTMLElement;
    const filterType = group.dataset.filterType as string;
    const value = button.dataset.value as string;
    
    const wasActive = button.classList.contains('bg-white');

    // Reset styles for all buttons in this group
    group.querySelectorAll('button').forEach(b => {
      b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900', 'font-semibold');
      b.classList.add('text-slate-600', 'font-medium');
    });

    // Clear and optionally set new value
    if (wasActive) {
      if (filterType === 'roles') selectedRoles = [];
      else if (filterType === 'genders') selectedGenders = [];
      else if (filterType === 'statuses') selectedStatuses = [];
    } else {
      button.classList.add('bg-white', 'shadow-sm', 'text-slate-900', 'font-semibold');
      button.classList.remove('text-slate-600', 'font-medium');
      if (filterType === 'roles') selectedRoles = [value];
      else if (filterType === 'genders') selectedGenders = [value];
      else if (filterType === 'statuses') selectedStatuses = [value];
    }
    
    currentLogsOffset = 0;
    loadLogsTab();
  });
});

// Tab Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    const target = (e.currentTarget as HTMLElement).dataset.tab!;
    activeTab = target;
    
    // Manage Views visibility
    document.getElementById('view-dashboard')!.style.display = 'none';
    document.getElementById('view-logs')!.style.display = 'none';
    document.getElementById('view-analytics')!.style.display = 'none';
    
    if (target === 'dashboard') {
        document.getElementById('view-dashboard')!.style.display = 'grid';
    } else {
        document.getElementById('view-' + target)!.style.display = 'flex';
    }

    // Manage Buttons classes
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.remove('bg-blue-50', 'text-blue-700');
      t.classList.add('text-slate-600');
    });
    const curr = (e.currentTarget as HTMLElement);
    curr.classList.add('bg-blue-50', 'text-blue-700');
    curr.classList.remove('text-slate-600');
    
    if (target === 'logs') {
      loadLogsTab();
    }
  });
});

// Helper initialization to hide non-default views
document.getElementById('view-logs')!.style.display = 'none';
document.getElementById('view-analytics')!.style.display = 'none';

// Live Timestamp Updates
setInterval(() => {
  document.querySelectorAll('[data-live-timestamp]').forEach(el => {
    const timestamp = el.getAttribute('data-live-timestamp');
    if (!timestamp || timestamp === 'null' || timestamp === 'undefined') return;
    
    // Check if it should have the " ago" suffix (Recent Logs on Dashboard)
    const hasAgoSuffix = el.querySelector('.opacity-70') !== null;
    const newTime = timeSince(timestamp);
    
    if (hasAgoSuffix) {
      el.innerHTML = `${newTime} <span class="font-normal opacity-70">ago</span>`;
    } else {
      el.textContent = newTime;
    }
  });
}, 1000);

// Start
init();
