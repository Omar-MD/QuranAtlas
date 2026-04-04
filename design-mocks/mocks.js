// QuranAtlas Design Mocks — Interactivity

function showScreen(id) {
  document.querySelectorAll('.mock-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.mock-nav-link').forEach(l => l.classList.remove('active'));

  const screen = document.getElementById(id);
  if (screen) screen.classList.add('active');

  const link = document.querySelector(`.mock-nav-link[data-screen="${id}"]`);
  if (link) link.classList.add('active');
}

function toggleTheme() {
  const html = document.documentElement;
  const themes = ['light', 'sepia', 'dark'];
  const current = html.getAttribute('data-theme');
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  html.setAttribute('data-theme', next);
}

function cycleFontSize() {
  const html = document.documentElement;
  const sizes = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
  const current = parseFloat(getComputedStyle(html).getPropertyValue('--qa-font-size-base') || '1');
  const idx = sizes.indexOf(current);
  const next = sizes[(idx + 1) % sizes.length];
  html.style.setProperty('--qa-font-size-base', next);
}

// Nav panel interactions
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('current'));
    item.classList.add('current');
    setTimeout(() => showScreen('reader'), 300);
  });
});

// Filter chip interactions
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

// Theme option interactions
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const theme = opt.getAttribute('data-theme');
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  });
});

// Toggle switch visual feedback
document.querySelectorAll('.toggle-switch input').forEach(toggle => {
  toggle.addEventListener('change', () => {
    // Visual feedback handled by CSS
  });
});

// Tag selection in modal
document.querySelectorAll('.tag-option').forEach(tag => {
  tag.addEventListener('click', (e) => {
    e.preventDefault();
    tag.classList.toggle('selected');
    const checkbox = tag.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = !checkbox.checked;
  });
});

// Mark indicator hover effect
document.querySelectorAll('.verse').forEach(verse => {
  verse.addEventListener('click', () => {
    // Show modal for demo
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      document.querySelectorAll('.mock-screen').forEach(s => s.classList.remove('active'));
      document.getElementById('marks-modal').classList.add('active');
      document.querySelectorAll('.mock-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector('[data-screen="marks-modal"]').classList.add('active');
    }
  });
});

// Modal close
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    showScreen('reader');
  });
});

// Resume dismiss
document.querySelectorAll('.resume-dismiss').forEach(btn => {
  btn.addEventListener('click', () => {
    const indicator = btn.closest('.resume-indicator');
    if (indicator) indicator.style.display = 'none';
  });
});

// Resume jump
document.querySelectorAll('.resume-jump').forEach(btn => {
  btn.addEventListener('click', () => {
    const indicator = btn.closest('.resume-indicator');
    if (indicator) indicator.style.display = 'none';
  });
});

// Nav close button
document.querySelectorAll('.nav-close').forEach(btn => {
  btn.addEventListener('click', () => {
    showScreen('reader');
  });
});

// Nav overlay click
document.querySelectorAll('.nav-overlay').forEach(overlay => {
  overlay.addEventListener('click', () => {
    showScreen('reader');
  });
});

// Bottom nav buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.mock-bottom-nav');
    parent.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
