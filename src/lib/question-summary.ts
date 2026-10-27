export function questionSummary(text: string) {
  const prompt =
    text
      .trim()
      .split(/\n\s*\n/)
      .at(-1)
      ?.trim() || text.trim();
  return prompt.length > 180 ? `${prompt.slice(0, 179).trimEnd()}…` : prompt;
}
