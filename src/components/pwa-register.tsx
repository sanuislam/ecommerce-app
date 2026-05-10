"use client";

import { useEffect } from "react";

export function PwaRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!enabled) {
      // Unregister any previously installed worker if PWA is disabled.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
        });
      });
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed", err);
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, [enabled]);
  return null;
}
