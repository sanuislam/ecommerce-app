import "server-only";
import { prisma } from "@/lib/prisma";

export const POLICY_SLUGS = ["privacy-policy", "terms", "refund-policy"] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

export const POLICY_META: Record<
  PolicySlug,
  { title: string; titleBn: string; description: string }
> = {
  "privacy-policy": {
    title: "Privacy Policy",
    titleBn: "গোপনীয়তা নীতি",
    description: "How we collect, use, and protect your personal information.",
  },
  terms: {
    title: "Terms & Conditions",
    titleBn: "শর্তাবলী",
    description: "Rules and conditions for using Eid Bazar.",
  },
  "refund-policy": {
    title: "Refund Policy",
    titleBn: "রিফান্ড নীতি",
    description: "Our refund, return and exchange policy.",
  },
};

export type PolicyDoc = {
  slug: PolicySlug;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  updatedAt: Date | null;
};

export async function getPolicyDoc(slug: PolicySlug): Promise<PolicyDoc | null> {
  try {
    const row = await prisma.policyDocument.findUnique({ where: { slug } });
    if (!row) return null;
    return {
      slug,
      titleEn: row.titleEn,
      titleBn: row.titleBn,
      bodyEn: row.bodyEn,
      bodyBn: row.bodyBn,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.error(`getPolicyDoc(${slug}) failed`, err);
    return null;
  }
}

export async function listPolicyDocs(): Promise<
  Record<PolicySlug, PolicyDoc | null>
> {
  const out = {
    "privacy-policy": null,
    terms: null,
    "refund-policy": null,
  } as Record<PolicySlug, PolicyDoc | null>;
  try {
    const rows = await prisma.policyDocument.findMany({
      where: { slug: { in: POLICY_SLUGS as unknown as string[] } },
    });
    for (const r of rows) {
      const slug = r.slug as PolicySlug;
      if (POLICY_SLUGS.includes(slug)) {
        out[slug] = {
          slug,
          titleEn: r.titleEn,
          titleBn: r.titleBn,
          bodyEn: r.bodyEn,
          bodyBn: r.bodyBn,
          updatedAt: r.updatedAt,
        };
      }
    }
  } catch (err) {
    console.error("listPolicyDocs failed", err);
  }
  return out;
}
