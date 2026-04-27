import type { ReactNode } from "react";

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
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs text-muted-foreground">
        সর্বশেষ হালনাগাদ / Last updated: {updatedAt}
      </p>

      <section lang="bn" className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{titleBn}</h1>
        <article className="prose prose-sm mt-6 max-w-none dark:prose-invert [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground">
          {bn}
        </article>
      </section>

      <hr className="my-12 border-dashed" />

      <section lang="en">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <article className="prose prose-sm mt-6 max-w-none dark:prose-invert [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground">
          {en}
        </article>
      </section>
    </div>
  );
}
