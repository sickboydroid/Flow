import { createIcons, Info, CheckCircle, XCircle } from 'lucide';

type SnackbarType = 'success' | 'error' | 'info';

export function showSnackbar(message: string, type: SnackbarType = 'info') {
  const container = document.getElementById('snackbar-container');
  if (!container) return;

  const el = document.createElement('div');
  let bgClass = 'bg-slate-800';
  let iconName = 'info';
  let textClass = 'text-white';

  if (type === 'success') {
    bgClass = 'bg-emerald-500';
    iconName = 'check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-red-500';
    iconName = 'x-circle';
  }

  el.className = `flex items-center gap-3 w-full px-4 py-3 rounded-lg shadow-lg pointer-events-auto transform transition-all duration-300 translate-y-8 opacity-0 ${bgClass} ${textClass}`;
  
  el.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 shrink-0"></i>
    <p class="text-sm font-medium">${message}</p>
  `;

  container.appendChild(el);
  
  // Create icons for newly injected HTML
  createIcons({
      icons: { Info, CheckCircle, XCircle },
      nameAttr: 'data-lucide',
      attrs: { class: "w-5 h-5 shrink-0" },
      root: el,
  });

  // Animate in
  requestAnimationFrame(() => {
    el.classList.remove('translate-y-8', 'opacity-0');
    el.classList.add('translate-y-0', 'opacity-100');
  });

  // Removes after 3s
  setTimeout(() => {
    el.classList.remove('translate-y-0', 'opacity-100');
    el.classList.add('translate-y-8', 'opacity-0');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
