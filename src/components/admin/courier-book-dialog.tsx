"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CourierId = "steadfast" | "pathao" | "redx";
type Item = { id: number; name: string };
type Result = { id: string; ok: boolean; error?: string; tracking?: string };

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const match = (items: Item[], want?: string | null) => {
  if (!want) return null;
  const w = key(want);
  return (
    items.find((i) => key(i.name) === w) ??
    items.find((i) => key(i.name).includes(w) || w.includes(key(i.name))) ??
    null
  );
};

async function lookup(qs: string): Promise<Item[]> {
  const res = await fetch(`/api/admin/couriers/lookup?${qs}`);
  const data = (await res.json().catch(() => ({}))) as { items?: Item[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not load the list");
  return data.items ?? [];
}

/**
 * Books one or many orders with a courier. For a single order the delivery
 * area can be checked and changed; bulk bookings match it from the address.
 */
export function CourierBookDialog({
  open,
  onOpenChange,
  orderIds,
  address,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderIds: string[];
  /** Single order: its district / area / postcode, to preselect courier areas. */
  address?: { district: string | null; area: string | null; postCode: string | null };
  onDone: () => void;
}) {
  const single = orderIds.length === 1 && !!address;
  const [couriers, setCouriers] = useState<{ id: CourierId; label: string }[] | null>(null);
  const [courier, setCourier] = useState<CourierId | null>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  // Pathao / RedX area pickers (single order only)
  const [cities, setCities] = useState<Item[]>([]);
  const [zones, setZones] = useState<Item[]>([]);
  const [areas, setAreas] = useState<Item[]>([]);
  const [city, setCity] = useState<number | "">("");
  const [zone, setZone] = useState<number | "">("");
  const [area, setArea] = useState<number | "">("");
  const [redxAreas, setRedxAreas] = useState<Item[]>([]);
  const [redxArea, setRedxArea] = useState<number | "">("");
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/couriers")
      .then((r) => r.json())
      .then((d: { couriers?: { id: CourierId; label: string }[] }) => {
        setResults(null);
        setCouriers(d.couriers ?? []);
        setCourier((c) => c ?? d.couriers?.[0]?.id ?? null);
      })
      .catch(() => setCouriers([]));
  }, [open]);

  // Load and preselect Pathao city → zone, or RedX areas, for a single order.
  useEffect(() => {
    if (!open || !single || !courier) return;
    let stop = false;
    (async () => {
      await Promise.resolve();
      setLoadingLists(true);
      try {
        if (courier === "pathao") {
          const cs = await lookup("courier=pathao&type=cities");
          if (stop) return;
          setCities(cs);
          const c = match(cs, address?.district);
          setCity(c?.id ?? "");
          if (c) {
            const zs = await lookup(`courier=pathao&type=zones&id=${c.id}`);
            if (stop) return;
            setZones(zs);
            const z = match(zs, address?.area);
            setZone(z?.id ?? "");
          }
        } else if (courier === "redx") {
          const qs = address?.postCode && /^\d{4}$/.test(address.postCode) ? `&post=${address.postCode}` : "";
          let list = qs ? await lookup(`courier=redx&type=areas${qs}`) : [];
          if (!list.length && address?.district) {
            list = await lookup(`courier=redx&type=areas&district=${encodeURIComponent(address.district)}`);
          }
          if (stop) return;
          setRedxAreas(list);
          setRedxArea(match(list, address?.area)?.id ?? (list.length === 1 ? list[0].id : ""));
        }
      } catch (err) {
        if (!stop) toast.error(err instanceof Error ? err.message : "Could not load areas");
      } finally {
        if (!stop) setLoadingLists(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [open, single, courier, address?.district, address?.area, address?.postCode]);

  async function pickCity(id: number | "") {
    setCity(id);
    setZone("");
    setArea("");
    setZones([]);
    setAreas([]);
    if (id) setZones(await lookup(`courier=pathao&type=zones&id=${id}`).catch(() => []));
  }
  async function pickZone(id: number | "") {
    setZone(id);
    setArea("");
    setAreas([]);
    if (id) setAreas(await lookup(`courier=pathao&type=areas&id=${id}`).catch(() => []));
  }

  async function book() {
    if (!courier || busy) return;
    if (single && courier === "redx" && !redxArea) {
      toast.error("Choose the RedX delivery area");
      return;
    }
    setBusy(true);
    try {
      const options: Record<string, unknown> = {};
      const w = Number(weight);
      if (weight && w > 0) options.weightKg = w;
      if (note.trim()) options.note = note.trim();
      if (single && courier === "pathao" && city && zone) {
        options.pathaoCity = city;
        options.pathaoZone = zone;
        if (area) options.pathaoArea = area;
      }
      if (single && courier === "redx" && redxArea) {
        options.redxAreaId = redxArea;
        options.redxAreaName = redxAreas.find((a) => a.id === redxArea)?.name;
      }
      const res = await fetch("/api/admin/couriers/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderIds, courier, options }),
      });
      const data = (await res.json().catch(() => ({}))) as { booked?: number; results?: Result[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Booking failed");
      setResults(data.results ?? []);
      if (data.booked) {
        toast.success(`${data.booked} parcel(s) booked`);
        onDone();
      }
      if (data.booked === orderIds.length) onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  const select = "h-9 w-full rounded-lg border bg-background px-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" /> Book courier
          </DialogTitle>
          <DialogDescription>
            {orderIds.length === 1 ? "1 order" : `${orderIds.length} orders`} · cash on delivery orders collect
            the order total; paid orders collect nothing. Booked orders are marked shipped.
          </DialogDescription>
        </DialogHeader>

        {couriers === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : couriers.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm">
            No courier is set up yet.{" "}
            <Link href="/admin/couriers" className="font-medium underline">
              Connect Steadfast, Pathao or RedX
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Courier">
              {couriers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={courier === c.id}
                  onClick={() => setCourier(c.id)}
                  className={cn(
                    "relative rounded-lg border p-3 text-sm font-medium transition-colors",
                    courier === c.id ? "border-foreground bg-muted/50" : "hover:border-foreground/30",
                  )}
                >
                  {c.label}
                  {courier === c.id && <Check className="absolute top-1.5 right-1.5 size-3.5" />}
                </button>
              ))}
            </div>

            {single && courier === "pathao" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <Label className="grid gap-1 text-xs">
                  City
                  <select className={select} value={city} onChange={(e) => void pickCity(Number(e.target.value) || "")}>
                    <option value="">Auto</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-1 text-xs">
                  Zone
                  <select className={select} value={zone} onChange={(e) => void pickZone(Number(e.target.value) || "")}>
                    <option value="">Auto</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-1 text-xs">
                  Area
                  <select className={select} value={area} onChange={(e) => setArea(Number(e.target.value) || "")}>
                    <option value="">Optional</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Label>
              </div>
            )}

            {single && courier === "redx" && (
              <Label className="grid gap-1 text-xs">
                Delivery area
                <select className={select} value={redxArea} onChange={(e) => setRedxArea(Number(e.target.value) || "")}>
                  <option value="">Choose area</option>
                  {redxAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Label>
            )}
            {single && loadingLists && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Loading delivery areas…
              </p>
            )}
            {!single && courier !== "steadfast" && (
              <p className="text-xs text-muted-foreground">
                Delivery areas are matched from each address. Orders that can&apos;t be matched are listed after
                booking — book those one at a time from the order page.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <Label className="grid gap-1 text-xs">
                Weight (kg)
                <Input
                  inputMode="decimal"
                  placeholder="Default"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </Label>
              <Label className="grid gap-1 text-xs">
                Note for the rider
                <Input
                  maxLength={200}
                  placeholder={orderIds.length === 1 ? "Uses the order note if empty" : "Same note for all"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Label>
            </div>

            {results && results.some((r) => !r.ok) && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                {results
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.id}>
                      <span className="font-medium">#{r.id.slice(0, 8)}</span> — {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          <Button onClick={() => void book()} disabled={!courier || busy || !couriers?.length}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Book {orderIds.length > 1 ? `${orderIds.length} parcels` : "parcel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
