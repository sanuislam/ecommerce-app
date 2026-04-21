"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Lang = "en" | "bn";

export function PolicyPage({
  title,
  titleBn,
  updatedAt,
  en,
  bn,
}: {
  title: string;
  titleBn: string;
  updatedAt: string;
  en: ReactNode;
  bn: ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const isBn = lang === "bn";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isBn ? "সর্বশেষ হালনাগাদ" : "Last updated"}: {updatedAt}
        </p>
        <div
          role="tablist"
          aria-label="Language"
          className="inline-flex rounded-md border bg-card p-0.5"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={!isBn}
            variant={!isBn ? "default" : "ghost"}
            size="sm"
            onClick={() => setLang("en")}
          >
            English
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={isBn}
            variant={isBn ? "default" : "ghost"}
            size="sm"
            onClick={() => setLang("bn")}
          >
            বাংলা
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">
        {isBn ? titleBn : title}
      </h1>

      <article
        lang={isBn ? "bn" : "en"}
        className="prose prose-sm mt-6 max-w-none dark:prose-invert [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground"
      >
        {isBn ? bn : en}
      </article>
    </div>
  );
}
