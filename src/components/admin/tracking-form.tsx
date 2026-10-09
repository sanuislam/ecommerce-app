"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Save, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TrackingForm({
  hasToken,
  tokenTail,
  testCode: initialTest,
  feedEnabled: initialFeed,
  feedUrl,
  pixelSet,
}: {
  hasToken: boolean;
  tokenTail: string;
  testCode: string;
  feedEnabled: boolean;
  feedUrl: string;
  pixelSet: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [removeToken, setRemoveToken] = useState(false);
  const [testCode, setTestCode] = useState(initialTest);
  const [feed, setFeed] = useState(initialFeed);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  async function save() {
    setBusy("save");
    try {
      const res = await fetch("/api/admin/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(token.trim() ? { fbCapiToken: token.trim() } : removeToken ? { fbCapiToken: "" } : {}),
          fbTestCode: testCode,
          feedEnabled: feed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setToken("");
      setRemoveToken(false);
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    try {
      const res = await fetch("/api/admin/tracking/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; received?: number };
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      toast.success(`Facebook received ${data.received ?? 0} event${data.received === 1 ? "" : "s"}. Check Events Manager → Test events.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="mt-5 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Facebook Conversions API</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sends each purchase from the server too, so ad blockers and iPhone privacy settings don&apos;t hide sales from
          Facebook. The browser and the server send the same event id, so a sale is counted once. Cash on delivery
          orders count when placed; online payments when paid. Orders typed in by staff are not sent.
        </p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="capi">Access token</Label>
            <Input
              id="capi"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? `Saved (…${tokenTail}). Paste a new one to replace it.` : "EAAG…"}
            />
            <p className="text-xs text-muted-foreground">
              Events Manager → your Pixel → Settings → Conversions API → Generate access token.
              {hasToken ? (
                <>
                  {" "}
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={removeToken} onChange={(e) => setRemoveToken(e.target.checked)} /> Remove the
                    saved token
                  </label>
                </>
              ) : null}
            </p>
          </div>
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="testcode">Test event code (only while testing)</Label>
            <Input id="testcode" value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST12345" />
            <p className="text-xs text-muted-foreground">Empty it when you are done, or real sales stay in “Test events”.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Product catalogue feed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For Facebook / Instagram Shops and dynamic ads (Commerce Manager → Data sources → Scheduled feed, hourly or
              daily), and Google Merchant Center. Each size / colour is its own item.
            </p>
          </div>
          <Switch checked={feed} onCheckedChange={setFeed} aria-label="Product feed" />
        </div>
        {feed ? (
          <div className="mt-3 flex gap-2">
            <Input readOnly value={feedUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(feedUrl).then(() => toast.success("Copied"))}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        ) : null}
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
        <Button type="button" variant="outline" onClick={test} disabled={!!busy || !hasToken || !pixelSet}>
          {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Send a test event
        </Button>
      </div>
    </>
  );
}
