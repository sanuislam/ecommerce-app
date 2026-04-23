"use client";

import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Mail, Send, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await axios.post("/api/newsletter", { email });
      setDone(true);
      toast.success("Subscribed! Check your inbox for offers.");
      setEmail("");
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not subscribe";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-primary-foreground shadow-lg sm:p-12"
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="absolute -left-10 -top-10 size-48 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -right-10 size-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Gift className="size-3.5" />
              Exclusive offers
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Get 10% off your first order
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/80 sm:text-base">
              Subscribe for early access to Eid collections, festive drops, and
              members-only discounts.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-foreground/70" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="h-11 w-full rounded-md bg-white/95 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-offset-2 focus:ring-2 focus:ring-white"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              disabled={loading || done}
              className="h-11 gap-1.5"
            >
              {done ? "Subscribed" : loading ? "Subscribing..." : "Subscribe"}
              {!done && !loading && <Send className="size-4" />}
            </Button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}
