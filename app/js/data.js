// Loads the trophy data and hands it to the rest of the app.
// The file is fetched from the app's own folder, so the guide works offline.
export const DATA_URL = 'data/trophies.json';

export const KIND_LABELS = {
  story: 'Story',
  side: 'Strangers & side',
  collectibles: 'Collectibles',
  activities: 'Activities',
  completion: 'Completion',
};

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const STAGE_INFO = {
  1: { title: 'Play the story', blurb: 'Chapters 1 to 4, the final mission, and every named story mission. Nothing here can be missed — finish the mission and the trophy pops.' },
  2: { title: 'Strangers of Leonida', blurb: 'The eight stranger mission strands scattered across the state. Each strand ends in its own trophy, and finishing all eight earns the Strangers & Freaks silver.' },
  3: { title: 'Explore, collect, and do the moments', blurb: 'The full map, the collectibles, the partner moments and the one-off activities. Do the eight possibly-missable trophies in this stage, while the story is still fresh.' },
  4: { title: 'Activities and the long grinds', blurb: 'Races, the shooting range, stunts, robberies and the money economy. These are counted totals — chip away at them between other stages and finish them here.' },
  5: { title: 'Cleanup and 100%', blurb: 'The last sweep: the in-game 100% checklist, then the platinum, which pops the moment the other 54 trophies are done.' },
};

let cached = null;

export async function loadGuide() {
  if (cached) return cached;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Could not load ${DATA_URL}: ${response.status}`);
  cached = await response.json();
  return cached;
}

export function trophyByName(doc, name) {
  return doc.trophies.find((t) => t.name === name) ?? null;
}

export function trophiesInStage(doc, stage) {
  return doc.trophies.filter((t) => t.stage === stage);
}

export function missableTrophies(doc) {
  return doc.trophies.filter((t) => t.missable);
}

export function gradeCounts(doc) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of doc.trophies) counts[t.grade] += 1;
  return counts;
}
