export function normalizeDietary(values: string[]): string[] {
  const empty = /^(?:n\/?a|none|nil|no|no restrictions?|no allergies?|not applicable|nothing)$/i;
  return [...new Set(values.map((value) => value.trim()).filter((value) => value && !empty.test(value)))];
}

export function missingPreferences(input: { name: string; placeId: string | null; dates: string[]; windows: string[]; activities: string[] }) {
  const missing: string[] = [];
  if (input.name.trim().length < 2) missing.push('Add a name or nickname of at least two characters.');
  if (!input.placeId) missing.push('Select your starting location from the suggestions.');
  if (!input.dates.length) missing.push('Choose at least one date.');
  if (!input.windows.length) missing.push('Choose at least one time window.');
  if (!input.activities.length) missing.push('Choose an activity or “Open to anything”.');
  return missing;
}
