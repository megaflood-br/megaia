"use client";

import { useEffect, useRef } from "react";

/** Polls while the browser tab is visible. */
export function useWhenVisibleInterval(callback: () => void, ms: number) {
  const cb = useRef(callback);

  useEffect(() => {
    cb.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") cb.current();
    };
    tick();
    const id = window.setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms]);
}
