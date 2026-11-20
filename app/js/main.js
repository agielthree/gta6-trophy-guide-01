// Boot: loads the trophy data, restores progress and settings, wires the
// toolbar and tabs, and renders the tracker. No network request happens here
// beyond fetching the app's own data file.
import { loadGuide } from './data.js';
import { exportFile, loadEarned, loadSettings, readImportFile, saveEarned, saveSettings, summariseImport } from './store.js';
import { renderDetail, renderList, renderMissables, renderProgress, renderRoadmap } from './render.js';

const state = {
  doc: null,
  earned: loadEarned(),
  selected: null,
  ...loadSettings(),
};

function renderAll() {
  renderProgress(state.doc, state.earned);
  renderList(state.doc, state, selectTrophy, toggleEarned);
  renderDetail(state.doc, state);
  renderRoadmap(state.doc, state);
  renderMissables(state.doc, state);
}

function selectTrophy(name) {
  state.selected = name;
  renderList(state.doc, state, selectTrophy, toggleEarned);
  renderDetail(state.doc, state);
}

function toggleEarned(name, checked) {
  if (checked) state.earned.add(name);
  else state.earned.delete(name);
  saveEarned(state.earned);
  renderAll();
}

function switchView(view) {
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${view}`;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
  document.getElementById('toolbar').style.display = view === 'tracker' ? '' : 'none';
}

function bindToolbar() {
  const search = document.getElementById('search');
  const kind = document.getElementById('kindFilter');
  const grade = document.getElementById('gradeFilter');
  const hideEarned = document.getElementById('hideEarned');
  const spoiler = document.getElementById('spoilerToggle');

  search.value = state.search;
  kind.value = state.kind;
  grade.value = state.grade;
  hideEarned.checked = state.hideEarned;
  spoiler.checked = state.spoiler;

  search.addEventListener('input', () => {
    state.search = search.value;
    saveSettings(state);
    renderList(state.doc, state, selectTrophy, toggleEarned);
    renderDetail(state.doc, state);
  });
  kind.addEventListener('change', () => {
    state.kind = kind.value;
    saveSettings(state);
    renderList(state.doc, state, selectTrophy, toggleEarned);
  });
  grade.addEventListener('change', () => {
    state.grade = grade.value;
    saveSettings(state);
    renderList(state.doc, state, selectTrophy, toggleEarned);
  });
  hideEarned.addEventListener('change', () => {
    state.hideEarned = hideEarned.checked;
    saveSettings(state);
    renderList(state.doc, state, selectTrophy, toggleEarned);
  });
  spoiler.addEventListener('change', () => {
    state.spoiler = spoiler.checked;
    saveSettings(state);
    renderList(state.doc, state, selectTrophy, toggleEarned);
    renderDetail(state.doc, state);
  });

  document.getElementById('exportBtn').addEventListener('click', () => exportFile(state.earned));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const names = await readImportFile(file);
      const known = new Set(state.doc.trophies.map((t) => t.name));
      const { valid, unknown } = summariseImport(names, known);
      state.earned = new Set(valid);
      saveEarned(state.earned);
      renderAll();
      if (unknown.length) alert(`${unknown.length} name${unknown.length === 1 ? '' : 's'} in that file are not trophies in this guide and were skipped.`);
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Clear all earned ticks? Your exported file, if any, is unaffected.')) return;
    state.earned = new Set();
    saveEarned(state.earned);
    renderAll();
  });
}

function bindTabs() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }
  // Round 2: keys 1–4 jump between the four sections without a mouse.
  const views = ['tracker', 'roadmap', 'missables', 'about'];
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < views.length) switchView(views[index]);
  });
}

async function boot() {
  state.doc = await loadGuide();
  if (!state.selected) state.selected = state.doc.trophies[16].name; // The Shootist, a good first guide.
  bindToolbar();
  bindTabs();
  renderAll();
}

boot().catch((error) => {
  document.getElementById('trophyList').replaceChildren();
  const note = document.createElement('p');
  note.className = 'empty';
  note.textContent = `The guide could not load its data file: ${error.message}`;
  document.getElementById('trophyList').append(note);
});
