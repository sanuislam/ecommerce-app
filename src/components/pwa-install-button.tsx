"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "eb:pwa-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Boolean(at) && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function subscribeToStandalone(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("appinstalled", cb);
  const mql = window.matchMedia?.("(display-mode: standalone)");
  mql?.addEventListener?.("change", cb);
  return () => {
    window.removeEventListener("appinstalled", cb);
    mql?.removeEventListener?.("change", cb);
  };
}

function subscribeToDismissed(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === DISMISS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("eb:install-dismissed", cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("eb:install-dismissed", cb);
  };
}

function useDeferredInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return evt;
}

function IosInstructionsSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">
              Install Eid Bazar on iPhone
            </h2>
            <p className="text-xs text-muted-foreground">
              Add the website to your home screen for a full-screen app
              experience.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
              1
            </span>
            <span>
              Tap the <Share className="-mt-0.5 inline size-4" /> Share button
              in Safari.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
              2
            </span>
            <span>
              Scroll and tap <Plus className="-mt-0.5 inline size-4" />{" "}
              <b>Add to Home Screen</b>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
              3
            </span>
            <span>Tap Add — the app icon will appear on your home screen.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

export function PwaInstallButton({
  className,
  variant = "default",
  size = "sm",
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
}) {
  const installed = useSyncExternalStore(
    subscribeToStandalone,
    readStandalone,
    () => false,
  );
  const deferred = useDeferredInstallPrompt();
  const [showIosSheet, setShowIosSheet] = useState(false);
  const ios = typeof window !== "undefined" && isIos();

  if (installed) return null;
  if (!ios && !deferred) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      return;
    }
    if (ios) setShowIosSheet(true);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <Download className="mr-1.5 size-4" />
        Install app
      </Button>
      {showIosSheet && (
        <IosInstructionsSheet onClose={() => setShowIosSheet(false)} />
      )}
    </>
  );
}

export function PwaInstallBanner() {
  const installed = useSyncExternalStore(
    subscribeToStandalone,
    readStandalone,
    () => false,
  );
  const dismissed = useSyncExternalStore(
    subscribeToDismissed,
    readDismissed,
    () => true,
  );
  const deferred = useDeferredInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  const ios = typeof window !== "undefined" && isIos();

  if (installed || dismissed) return null;
  if (!deferred && !ios) return null;

  function close() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      window.dispatchEvent(new Event("eb:install-dismissed"));
    } catch {
      // ignore
    }
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      close();
      return;
    }
    if (ios) setIosOpen(true);
  }

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:bottom-4 sm:right-4 sm:left-auto sm:mx-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-400 text-white">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            Install Eid Bazar app
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Faster checkout, offline browsing, home-screen icon.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" onClick={install}>
            Install
          </Button>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss install prompt"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      {iosOpen && (
        <IosInstructionsSheet onClose={() => setIosOpen(false)} />
      )}
    </>
  );
}
