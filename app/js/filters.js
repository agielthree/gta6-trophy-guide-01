// Filtering, searching and the spoiler rule for the tracker list.
// The spoiler rule: with spoiler-free mode on, a story trophy the player has
// not earned yet shows a placeholder name and description instead of the real ones.
export function spoilerHides(trophy, earned, spoilerOn) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.name);
}

export function displayName(trophy, earned, spoilerOn) {
  return spoilerHides(trophy, earned, spoilerOn) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(trophy, earned, spoilerOn) {
  if (spoilerHides(trophy, earned, spoilerOn)) {
    return 'A story trophy — its name and description stay hidden until you earn it.';
  }
  return trophy.description;
}

export function applyFilters(trophies, state) {
  const query = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'online') return false; // No online trophies in the official list.
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.hideEarned && state.earned.has(t.name)) return false;
    if (query) {
      const haystack = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
