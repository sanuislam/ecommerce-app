import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audienceLabel, campaignPhones, parseAudience } from "@/lib/segments";
import { getSmsSettings, smsBalance } from "@/lib/sms";
import { getSeoSettings } from "@/lib/seo-settings";
import { siteUrl } from "@/lib/site-url";
import { AudienceForm } from "@/components/admin/audience-form";
import { CampaignComposer } from "@/components/admin/campaign-composer";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewCampaignPage({ searchParams }: Props) {
  const a = parseAudience(await searchParams);
  const session = await auth();
  const [phones, categories, sms, me, seo] = await Promise.all([
    campaignPhones(a),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSmsSettings(),
    session?.user ? prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } }) : null,
    getSeoSettings().catch(() => null),
  ]);
  const smsReady = sms.enabled && !!sms.apiKey;
  const balance = smsReady ? await smsBalance(sms.apiKey) : null;
  const catName = categories.find((c) => c.id === a.categoryId)?.name;
  const shop = seo?.siteName || "Eid Bazar";

  return (
    <div className="max-w-4xl p-4 sm:p-6">
      <Link href="/admin/campaigns" className="text-sm text-muted-foreground hover:underline">
        ← SMS campaigns
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New SMS campaign</h1>

      <section className="mt-5 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">1. Who gets it</h2>
        <div className="mt-3">
          <AudienceForm action="/admin/campaigns/new" audience={a} categories={categories} />
        </div>
        <p className="mt-3 text-sm">
          <span className="font-medium">{audienceLabel(a, catName)}</span>:{" "}
          <span className="font-semibold tabular-nums">{phones.length}</span> mobile number{phones.length === 1 ? "" : "s"} (customers
          who turned off promotional SMS and accounts without a valid number are left out).
        </p>
      </section>

      {!smsReady ? (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Set up SMS first in <Link href="/admin/sms" className="underline">Admin → SMS</Link>.
        </p>
      ) : null}

      <CampaignComposer
        audience={{ ...a, q: "" }}
        recipients={phones.length}
        smsReady={smsReady}
        balance={balance?.ok ? (balance.balance ?? null) : null}
        myPhone={me?.phone ?? ""}
        shop={shop}
        site={siteUrl().replace(/^https?:\/\//, "")}
      />
    </div>
  );
}
