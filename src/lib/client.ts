const root = document.documentElement;

function toggleTheme() {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    return;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-theme-toggle]')) toggleTheme();
});
