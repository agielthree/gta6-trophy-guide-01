// Renders every view of the guide: the progress header, the checklist with its
// detail pane, the roadmap stages and the missables page. All text is built with
// textContent (never innerHTML from data), so a trophy name can never break the page.
import { GRADE_LABELS, KIND_LABELS, STAGE_INFO, gradeCounts, missableTrophies, nextUpInStage, stageSummary, trophiesInStage } from './data.js';
import { applyFilters, displayDescription, displayName, spoilerHides } from './filters.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function difficultyStars(difficulty) {
  return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
}

export function renderProgress(doc, earned) {
  const total = doc.trophies.length;
  document.getElementById('earnedCount').textContent = String(earned.size);
  const bar = document.getElementById('progressBar');
  bar.setAttribute('aria-valuenow', String(earned.size));
  document.getElementById('progressFill').style.width = `${(earned.size / total) * 100}%`;
  const counts = gradeCounts(doc);
  const earnedByGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of doc.trophies) if (earned.has(t.name)) earnedByGrade[t.grade] += 1;
  document.getElementById('progressLabel').textContent =
    earned.size === total ? 'platinum earned — Leonida Legend!' : 'earned';
  document.getElementById('gradeLine').textContent =
    `Platinum ${earnedByGrade.platinum}/${counts.platinum} · Gold ${earnedByGrade.gold}/${counts.gold} · ` +
    `Silver ${earnedByGrade.silver}/${counts.silver} · Bronze ${earnedByGrade.bronze}/${counts.bronze}`;
  document.getElementById('missableCount').textContent = String(missableTrophies(doc).length);
}

export function renderList(doc, state, onSelect, onToggle) {
  const list = document.getElementById('trophyList');
  const visible = applyFilters(doc.trophies, state);
  list.replaceChildren();
  for (const t of visible) {
    const row = el('li', 'trophy-row');
    if (state.selected === t.name) row.classList.add('selected');
    if (state.earned.has(t.name)) row.classList.add('earned');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => onToggle(t.name, box.checked));
    row.append(box);

    const body = el('div');
    body.append(el('div', 'trophy-name', displayName(t, state.earned, state.spoiler)));
    body.append(el('div', 'trophy-desc', displayDescription(t, state.earned, state.spoiler)));
    const tags = el('div', 'trophy-tags');
    tags.append(el('span', `tag grade-${t.grade}`, GRADE_LABELS[t.grade]));
    tags.append(el('span', 'tag', KIND_LABELS[t.kind]));
    if (t.missable) tags.append(el('span', 'tag missable', 'Possibly missable'));
    if (state.earned.has(t.name)) tags.append(el('span', 'tag earned-tag', 'Earned'));
    body.append(tags);
    row.append(body);

    const side = el('div', 'trophy-count', t.count_label ?? '');
    row.append(side);
    row.addEventListener('click', () => onSelect(t.name));
    list.append(row);
  }
  document.getElementById('emptyState').hidden = visible.length > 0;
  document.getElementById('listMeta').textContent =
    state.kind === 'online'
      ? 'No online trophies: every trophy in the official list is earned in single-player.'
      : `Showing ${visible.length} of ${doc.trophies.length} trophies` +
        (state.earned.size ? ` · ${state.earned.size} earned` : '');
}

export function renderDetail(doc, state) {
  const pane = document.getElementById('detailPane');
  const trophy = doc.trophies.find((t) => t.name === state.selected) ?? null;
  pane.replaceChildren();
  if (!trophy) {
    pane.append(el('p', 'detail-empty', 'Select a trophy on the left to see its official description, its guide, and its sources.'));
    return;
  }
  const hidden = spoilerHides(trophy, state.earned, state.spoiler);
  pane.append(el('h2', null, hidden ? 'Hidden story trophy' : trophy.name));
  const tags = el('div', 'trophy-tags');
  tags.append(el('span', `tag grade-${trophy.grade}`, GRADE_LABELS[trophy.grade]));
  tags.append(el('span', 'tag', KIND_LABELS[trophy.kind]));
  if (trophy.missable) tags.append(el('span', 'tag missable', 'Possibly missable'));
  if (state.earned.has(trophy.name)) tags.append(el('span', 'tag earned-tag', 'Earned'));
  pane.append(tags);
  if (trophy.count_label) pane.append(el('p', 'difficulty', trophy.count_label));
  pane.append(el('p', 'difficulty', `Difficulty ${difficultyStars(trophy.difficulty)}`));

  pane.append(el('h3', null, 'Official description'));
  pane.append(el('p', 'official', hidden ? 'Hidden until earned.' : trophy.description));

  if (hidden) {
    pane.append(el('p', null, 'Spoiler-free mode is on. Earn this story trophy to reveal its guide — or switch spoiler-free mode off in the toolbar.'));
    return;
  }
  if (trophy.missable && trophy.missable_note) {
    pane.append(el('p', 'warn-box', `⚠ ${trophy.missable_note}`));
  }
  if (trophy.missable && trophy.missable_check) {
    pane.append(el('p', 'verify-note', `Verified? No — not in play yet (game released 19 Nov 2026). Why it is flagged: ${trophy.missable_check.basis} Risk: ${trophy.missable_check.risk} Do it early: ${trophy.missable_check.do_early}`));
  }
  pane.append(el('h3', null, 'Guide'));
  pane.append(el('p', null, trophy.guide));
  if (trophy.steps?.length) {
    pane.append(el('h3', null, 'Steps'));
    const steps = el('ol');
    for (const step of trophy.steps) steps.append(el('li', null, step));
    pane.append(steps);
  }
  pane.append(el('h3', null, 'Sources'));
  const sources = el('ul', 'sources');
  for (const key of trophy.sources) {
    const info = doc.source_list[key];
    if (!info) continue;
    const item = el('li');
    const link = document.createElement('a');
    link.href = info.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = info.label;
    item.append(link);
    sources.append(item);
  }
  const own = el('li');
  own.textContent = 'Guide: our own reading of the official description — not yet verified in play (game released 19 Nov 2026).';
  sources.append(own);
  pane.append(sources);
}

export function renderRoadmap(doc, state) {
  renderStageSummary(doc, state);
  const host = document.getElementById('roadmapStages');
  host.replaceChildren();
  for (const stage of [1, 2, 3, 4, 5]) {
    const info = STAGE_INFO[stage];
    const trophies = trophiesInStage(doc, stage);
    const earned = trophies.filter((t) => state.earned.has(t.name)).length;
    const section = el('section', 'stage');
    const heading = el('h3');
    heading.append(el('span', 'stage-num', `Stage ${stage} — `));
    heading.append(document.createTextNode(info.title));
    section.append(heading);
    section.append(el('p', 'stage-meta', `${info.blurb} (${earned}/${trophies.length} earned in this stage)`));
    const list = el('ul');
    for (const t of trophies) {
      const item = el('li');
      item.append(document.createTextNode(`${state.earned.has(t.name) ? '✓ ' : '○ '}${t.name} — ${GRADE_LABELS[t.grade]}${t.missable ? ' — possibly missable' : ''}`));
      list.append(item);
    }
    section.append(list);
    host.append(section);
  }
}

// Round 2: the per-stage progress cards at the top of the roadmap page.
// Each card shows earned/total, a percent bar, the next trophy to chase,
// and the full list of trophies still left in that stage.
export function renderStageSummary(doc, state) {
  const host = document.getElementById('stageSummary');
  if (!host) return;
  host.replaceChildren();
  const summaries = stageSummary(doc, state.earned);
  const overall = summaries.reduce((acc, s) => acc + s.earned, 0);
  const overallTotal = summaries.reduce((acc, s) => acc + s.total, 0);
  const headline = el('p', 'stage-summary-headline',
    overall === overallTotal
      ? 'Every stage is complete — the platinum is yours.'
      : `${overall} of ${overallTotal} trophies earned across 5 stages. The stage furthest behind is the one to work next.`);
  host.append(headline);
  for (const s of summaries) {
    const card = el('article', 'stage-card');
    if (s.done) card.classList.add('stage-done');
    const heading = el('h3');
    heading.append(el('span', 'stage-num', `Stage ${s.stage} — `));
    heading.append(document.createTextNode(s.title));
    card.append(heading);
    card.append(el('p', 'stage-meta', `${s.earned}/${s.total} earned · ${s.percent}%${s.done ? ' · complete' : ''}`));
    const bar = el('div', 'stage-bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(s.total));
    bar.setAttribute('aria-valuenow', String(s.earned));
    const fill = el('div', 'stage-fill');
    fill.style.width = `${s.percent}%`;
    bar.append(fill);
    card.append(bar);
    const next = nextUpInStage(doc, s.stage, state.earned);
    card.append(el('p', 'stage-next', next ? `Next up: ${next}` : 'Nothing left in this stage.'));
    if (s.remaining.length) {
      card.append(el('p', 'stage-remaining', `Still to do (${s.remaining.length}): ${s.remaining.join(' · ')}`));
    }
    host.append(card);
  }
}

export function renderMissables(doc, state) {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  for (const t of missableTrophies(doc)) {
    const section = el('section', 'stage');
    const heading = el('h3');
    heading.append(document.createTextNode(`${state.earned.has(t.name) ? '✓ ' : '○ '}${t.name}`));
    section.append(heading);
    section.append(el('p', 'stage-meta', `${GRADE_LABELS[t.grade]} · ${KIND_LABELS[t.kind]} · Difficulty ${difficultyStars(t.difficulty)}`));
    section.append(el('p', 'official', t.description));
    section.append(el('p', 'warn-box', `⚠ ${t.missable_note ?? 'Flagged from the official description only — not confirmed in play.'}`));
    if (t.missable_check) {
      section.append(el('p', 'verify-note', `Verification — basis: ${t.missable_check.basis} Risk: ${t.missable_check.risk} Do it early: ${t.missable_check.do_early} (Not verified in play — the game released 19 Nov 2026.)`));
    }
    section.append(el('p', null, t.guide));
    host.append(section);
  }
}
