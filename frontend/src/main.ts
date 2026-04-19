import './styles/style.css';
import { createIcons, LayoutDashboard, List, BarChart2, Plus, ArrowDown, History, UserX, X, Search, Loader2, ArrowLeft, ArrowRight } from 'lucide';
import { api } from './api/client';
import type { StudentInfo, StudentLog } from './api/client';
import { showSnackbar } from './utils/snackbar';

// Application State
let recentLogs: StudentLog[] = [];
let lastScannedStudent: StudentInfo | null = null;
let lastScannedStatus: 'IN' | 'OUT' | 'NO ACTIVITY' | null = null;
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
  icons: { LayoutDashboard, List, BarChart2, Plus, ArrowDown, History, UserX, X, Search, Loader2, ArrowLeft, ArrowRight },
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
    const statusColor = isOut ? 'bg-amber-500' : 'bg-emerald-500';
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
          <span class="text-xs font-semibold text-slate-400 tracking-wide">${timeStr} <span class="font-normal opacity-70">ago</span></span>
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

  const statusColor = lastScannedStatus === 'IN' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200';

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

async function openStudentInfo(enroll: string) {
  isAcceptingScans = false; // Pause scanning
  studentInfoDialog.showModal();
  const content = document.getElementById('student-info-content')!;
  content.innerHTML = `<div class="shimmer w-full h-32 rounded-xl mb-4"></div>`;

  const info = await api.getStudentInfo(enroll);
  if (info) {
    content.innerHTML = `
      <img src="http://localhost:5000/profilepics/${info.enrollment.toLowerCase()}.jpg" class="w-20 h-20 rounded-full mb-4 shadow object-cover" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${info.firstName}&background=random'" />
      <h4 class="text-xl font-bold text-slate-800 font-outfit">${info.firstName} ${info.lastName}</h4>
      <p class="text-sm font-medium text-slate-500 mb-2">${info.enrollment}</p>
      <div class="text-left w-full mt-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
        <p class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500 uppercase tracking-wider text-xs">Branch</span> <span class="font-medium text-slate-800">${info.branch || 'N/A'}</span></p>
        <p class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500 uppercase tracking-wider text-xs">Year</span> <span class="font-medium text-slate-800">${info.year || 'N/A'}</span></p>
        <p class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500 uppercase tracking-wider text-xs">Role</span> <span class="font-medium text-slate-800">${info.isHosteller ? 'Hosteller' : 'Day Scholar'}</span></p>
        <p class="flex justify-between border-b border-slate-200 pb-2"><span class="font-semibold text-slate-500 uppercase tracking-wider text-xs">Gender</span> <span class="font-medium text-slate-800 capitalize">${info.gender || 'N/A'}</span></p>
        <p class="flex justify-between"><span class="font-semibold text-slate-500 uppercase tracking-wider text-xs">Contact</span> <span class="font-medium text-slate-800">${info.phoneNumber || 'Not Provided'}</span></p>
      </div>
    `;
  } else {
    content.innerHTML = `<p class="text-red-500">Failed to load info</p>`;
  }
}

document.querySelectorAll('.close-dialog-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    manualEntryDialog.close();
    studentInfoDialog.close();
    isAcceptingScans = true; 
  });
});

// Manual entry
addEntryBtn.addEventListener('click', () => {
  isAcceptingScans = false;
  manualEntryForm.reset();
  manualEntryDialog.showModal();
});

manualEntryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const enrollInput = document.getElementById('enrollment-input') as HTMLInputElement;
  const enroll = enrollInput.value.trim();
  
  const isValid = await api.isValidEnroll(enroll);
  if (!isValid) {
    showSnackbar('Invalid Enrollment Number', 'error');
    return;
  }
  
  manualEntryDialog.close();
  isAcceptingScans = true;
  await processScan(enroll);
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
      const statusColor = log.status === 'NO ACTIVITY' ? 'text-slate-400' : isOut ? 'text-amber-600' : 'text-emerald-600';
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
          <td class="py-3 px-4 text-right text-slate-500 font-medium">${timeStr}</td>
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
    
    if (button.classList.contains('bg-white')) {
       button.classList.remove('bg-white', 'shadow-sm', 'text-slate-900', 'font-semibold');
       button.classList.add('text-slate-600', 'font-medium');
       if (filterType === 'roles') selectedRoles = selectedRoles.filter(v => v !== value);
       else if (filterType === 'genders') selectedGenders = selectedGenders.filter(v => v !== value);
       else if (filterType === 'statuses') selectedStatuses = selectedStatuses.filter(v => v !== value);
    } else {
       button.classList.add('bg-white', 'shadow-sm', 'text-slate-900', 'font-semibold');
       button.classList.remove('text-slate-600', 'font-medium');
       if (filterType === 'roles') selectedRoles.push(value);
       else if (filterType === 'genders') selectedGenders.push(value);
       else if (filterType === 'statuses') selectedStatuses.push(value);
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

// Start
init();
