"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findByCode,
  type Country,
} from "@/lib/country-codes";
import { cn } from "@/lib/utils";

export function SignUpForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Detect country from IP on mount (Vercel edge headers first, public fallback).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{ country: string | null }>(
          "/api/geo",
          { timeout: 3000 },
        );
        if (!cancelled && data?.country) {
          const c = findByCode(data.country);
          if (c) {
            setCountry(c);
            return;
          }
        }
      } catch {
        // ignore, fall through to public service
      }
      try {
        const { data } = await axios.get<{ country_code?: string }>(
          "https://ipapi.co/json/",
          { timeout: 3000 },
        );
        if (!cancelled && data?.country_code) {
          const c = findByCode(data.country_code);
          if (c) setCountry(c);
        }
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Click-outside closes the picker.
  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [pickerOpen]);

  const filtered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [pickerQuery]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedLocal = phone.replace(/[^\d]/g, "");
      if (!normalizedLocal) {
        toast.error("Please enter your mobile number");
        setLoading(false);
        return;
      }
      const fullPhone = `${country.dial}${normalizedLocal}`;
      await axios.post("/api/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        phone: fullPhone,
      });
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      toast.success("Account created");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not create account";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="phone">Mobile number</Label>
        <div
          ref={pickerRef}
          className="relative mt-1.5 flex rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring"
        >
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Select country code"
            aria-expanded={pickerOpen}
            className="flex items-center gap-1.5 border-r px-2.5 text-sm font-medium hover:bg-accent/50"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="tabular-nums">{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          <input
            id="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="1XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-r-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {pickerOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[320px] max-w-[90vw] rounded-md border bg-popover shadow-md">
              <div className="flex items-center gap-2 border-b px-2.5 py-2">
                <Search className="h-4 w-4 opacity-60" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search country or code"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto py-1 text-sm">
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-muted-foreground">
                    No match
                  </li>
                )}
                {filtered.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setCountry(c);
                        setPickerOpen(false);
                        setPickerQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent",
                        c.code === country.code && "bg-accent/50",
                      )}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.dial}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
