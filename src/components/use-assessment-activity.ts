"use client";
import { useEffect, useEffectEvent } from "react";
import type { ActivityInput } from "@/lib/assessment-support";
export function useAssessmentActivity(id: string, active: boolean) {
  const isStillActive = useEffectEvent(() => active);
  useEffect(() => {
    if (!active) return;
    const key = "adaptiva:activity:" + id;
    let events: ActivityInput["events"] = [],
      sending = false,
      stopped = false,
      lastVisible = !document.hidden;
    let request: AbortController | null = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      if (Array.isArray(saved))
        events = saved
          .filter((e) => typeof e.id === "string" && typeof e.kind === "string")
          .slice(-100);
    } catch {
      /* Browser storage may be unavailable. */
    }
    const persist = () => {
      try {
        sessionStorage.setItem(key, JSON.stringify(events));
      } catch {
        /* Telemetry cannot block answering. */
      }
    };
    const payload = () => ({
      sitting_id: id,
      events: events.slice(0, 20),
      presence: {
        visible: !document.hidden,
        focused: document.hasFocus(),
        online: navigator.onLine,
        fullscreen: !!document.fullscreenElement,
      },
    });
    async function flush() {
      if (sending || stopped || !navigator.onLine) return;
      sending = true;
      const body = payload();
      request = new AbortController();
      try {
        const r = await fetch("/api/assessment/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true,
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
        });
        if (!r.ok) return;
        const data = await r.json();
        const ids = new Set(body.events.map((e) => e.id));
        events = events.filter((e) => !ids.has(e.id));
        persist();
        if (data.accepted === false) stopped = true;
      } catch {
        /* Retry the same event IDs on the next signal or heartbeat. */
      } finally {
        sending = false;
      }
    }
    function record(kind: ActivityInput["events"][number]["kind"]) {
      if (stopped) return;
      events.push({ id: crypto.randomUUID(), kind });
      events = events.slice(-100);
      persist();
      void flush();
    }
    function visibility() {
      const visible = !document.hidden;
      if (visible !== lastVisible) {
        lastVisible = visible;
        record(visible ? "visible" : "hidden");
      }
    }
    const blur = () => record("blur"),
      focus = () => record("focus"),
      offline = () => record("offline"),
      online = () => record("online");
    const fullscreen = () => {
      if (!document.fullscreenElement) record("fullscreen_exit");
    };
    const pagehide = () => {
      if (lastVisible) {
        lastVisible = false;
        record("hidden");
      }
      if (!stopped && events.length)
        navigator.sendBeacon(
          "/api/assessment/activity",
          new Blob([JSON.stringify(payload())], { type: "application/json" }),
        );
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("pagehide", pagehide);
    record("opened");
    const timer = setInterval(() => void flush(), 20000);
    return () => {
      request?.abort();
      if (!stopped && isStillActive()) {
        events.push({ id: crypto.randomUUID(), kind: "left_assessment" });
        events = events.slice(-100);
        persist();
        const body = payload();
        body.presence.visible = false;
        body.presence.focused = false;
        navigator.sendBeacon(
          "/api/assessment/activity",
          new Blob([JSON.stringify(body)], { type: "application/json" }),
        );
      }
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [id, active]);
}
