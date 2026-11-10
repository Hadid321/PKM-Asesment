import type { ActivityInput } from "./assessment-support";
export const FOCUS_RULES = {
  version: "focus-v1",
  limit: 3,
  grace_ms: 2000,
} as const;
export type FocusState = {
  enabled: boolean;
  strikes: number;
  total_strikes: number;
  limit: 3;
  locked: boolean;
  reason: string | null;
  version: number;
};
export type FocusControl = {
  strikes: number;
  total_strikes: number;
  locked: boolean;
  away: boolean;
  pending_since: number | null;
  version: number;
  current_page: string | null;
  pages: Record<string, number>;
};
export const newFocusControl = (): FocusControl => ({
  strikes: 0,
  total_strikes: 0,
  locked: false,
  away: false,
  pending_since: null,
  version: 0,
  current_page: null,
  pages: {},
});
export function focusView(enabled: boolean, c?: FocusControl): FocusState {
  return {
    enabled,
    strikes: c?.strikes ?? 0,
    total_strikes: c?.total_strikes ?? 0,
    limit: 3,
    locked: c?.locked ?? false,
    version: c?.version ?? 0,
    reason: c?.locked
      ? "Pengerjaan dihentikan sementara setelah tiga pelanggaran fokus. Jawaban tersimpan dan waktu tetap berjalan. Hubungi guru untuk meminta izin lanjut."
      : null,
  };
}
// Only fresh, ordered events reach this reducer. Blur/offline are observations.
export function applyFocus(
  c: FocusControl,
  input: ActivityInput,
  now: number,
): boolean {
  const page = input.presence.page_id,
    seq = input.presence.sequence;
  if (!page || seq === undefined) return false;
  const seen = c.pages[page];
  if (seen !== undefined && seq <= seen) return false;
  if (seen === undefined) {
    if (
      !input.events.some((e) => e.kind === "opened") ||
      Object.keys(c.pages).length >= 128
    )
      return false;
    if (input.presence.visible && input.presence.online) c.current_page = page;
  }
  c.pages[page] = seq;
  if (c.current_page !== page) {
    if (
      input.presence.visible &&
      input.presence.online &&
      input.events.some((e) => e.kind === "visible")
    )
      c.current_page = page;
    else return false;
  }
  const strike = () => {
    if (c.locked) return;
    c.strikes++;
    c.total_strikes++;
    c.pending_since = null;
    c.locked = c.strikes >= FOCUS_RULES.limit;
    c.version++;
  };
  for (const e of input.events) {
    if (e.kind === "opened" || e.kind === "visible") {
      if (
        c.away &&
        c.pending_since !== null &&
        input.presence.online &&
        now - c.pending_since >= FOCUS_RULES.grace_ms
      )
        strike();
      c.away = false;
      c.pending_since = null;
    } else if (e.kind === "hidden" && !c.away) {
      c.away = true;
      c.pending_since = now;
    } else if (
      e.kind === "left_assessment" &&
      (!c.away || c.pending_since !== null)
    ) {
      c.away = true;
      strike();
    }
  }
  // A second on-line report while still hidden confirms the grace period.
  // Hidden+visible first received together still has no elapsed server time.
  if (
    !input.presence.visible &&
    input.presence.online &&
    c.away &&
    c.pending_since !== null &&
    now - c.pending_since >= FOCUS_RULES.grace_ms
  )
    strike();
  return true;
}
export function resumeFocus(c: FocusControl) {
  c.strikes = 0;
  c.locked = false;
  c.away = false;
  c.pending_since = null;
  c.version++;
}
