export interface BktParameters {
  initial: number;
  learn: number;
  guess: number;
  slip: number;
}
// Parameter prototipe, belum dikalibrasi dengan data penelitian.
export const BKT: Readonly<BktParameters> = Object.freeze({
  initial: 0.3,
  learn: 0.1,
  guess: 0.2,
  slip: 0.1,
});
export const MASTERY_THRESHOLD = 0.95;
export const MAX_QUESTIONS = 10;
export function probability(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new Error("Probabilitas harus berada pada rentang 0–1.");
  return value;
}
export function updateBkt(
  p: number,
  correct: boolean,
  params: BktParameters = BKT,
): number {
  probability(p);
  Object.values(params).forEach(probability);
  const likelihoodKnown = correct ? 1 - params.slip : params.slip;
  const likelihoodUnknown = correct ? params.guess : 1 - params.guess;
  const denominator = p * likelihoodKnown + (1 - p) * likelihoodUnknown;
  // Bukti mustahil pada parameter ekstrem: pertahankan prior, lalu terapkan belajar.
  const posterior = denominator === 0 ? p : (p * likelihoodKnown) / denominator;
  return probability(
    Number((posterior + (1 - posterior) * params.learn).toFixed(8)),
  );
}
export function difficultyFor(p: number) {
  probability(p);
  return p < 0.4 ? "easy" : p <= 0.7 ? "medium" : "hard";
}
