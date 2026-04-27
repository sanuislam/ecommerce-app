import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import {
  POLICY_META,
  POLICY_SLUGS,
  listPolicyDocs,
} from "@/lib/policy-docs";

export const dynamic = "force-dynamic";

export default async function AdminPoliciesPage() {
  const docs = await listPolicyDocs();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Legal pages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit the Privacy Policy, Terms & Conditions, and Refund Policy. Each
        page renders Bengali first, then English on the same public page.
      </p>

      <div className="mt-6 grid gap-3 sm:max-w-2xl">
        {POLICY_SLUGS.map((slug) => {
          const meta = POLICY_META[slug];
          const doc = docs[slug];
          return (
            <Link
              key={slug}
              href={`/admin/policies/${slug}`}
              className="group flex items-center justify-between rounded-lg border bg-card p-4 transition hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{meta.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {meta.titleBn} ·{" "}
                    {doc
                      ? `Last edited ${new Date(doc.updatedAt!).toLocaleString()}`
                      : "Using built-in default content"}
                  </div>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
