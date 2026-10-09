"use client";

import { useEffect } from "react";

/**
 * Hides the live-chat bubble (Tawk.to) while something of ours sits in the
 * same corner — the "Install app" card, its iOS sheet. Tawk's iframe is
 * stacked above everything (z-index ~2e9), so it would cover our buttons.
 * Several callers may hide it at once; it comes back when the last lets go.
 * Tawk loads lazily: `window.__ebChatHidden` is read by its onLoad hook
 * (components/site/tawk-chat.tsx), so a bubble that loads later stays hidden.
 */
type TawkApi = { hideWidget?: () => void; showWidget?: () => void };
type ChatWindow = Window & { Tawk_API?: TawkApi; __ebChatHidden?: boolean };

const holders = new Set<symbol>();

function apply() {
  const w = window as ChatWindow;
  const hidden = holders.size > 0;
  w.__ebChatHidden = hidden;
  try {
    if (hidden) w.Tawk_API?.hideWidget?.();
    else w.Tawk_API?.showWidget?.();
  } catch {
    // Tawk not ready yet: its onLoad hook reads __ebChatHidden.
  }
}

export function useHideChatWidget(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const me = Symbol("chat-hide");
    holders.add(me);
    apply();
    return () => {
      holders.delete(me);
      apply();
    };
  }, [active]);
}
