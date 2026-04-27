import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  POLICY_META,
  POLICY_SLUGS,
  type PolicySlug,
  getPolicyDoc,
} from "@/lib/policy-docs";
import { PolicyEditor } from "@/components/admin/policy-editor";

export const dynamic = "force-dynamic";

const DEFAULT_BODY: Record<PolicySlug, { bn: string; en: string }> = {
  "privacy-policy": {
    bn: `আমরা আপনার ব্যক্তিগত তথ্যকে সম্মান করি।

## ১. আমরা যে তথ্য সংগ্রহ করি
- নাম, ইমেইল, মোবাইল নম্বর ও শিপিং ঠিকানা
- পেমেন্ট সংক্রান্ত মেটাডাটা (পেমেন্ট প্রসেসর দ্বারা পরিচালিত)
- কুকি ও অ্যানালিটিক্স ডেটা

## ২. কীভাবে ব্যবহার করি
- অর্ডার পরিচালনা ও কাস্টমার সাপোর্টের জন্য
- সাইট উন্নত করার জন্য

## ৩. যোগাযোগ
যেকোনো প্রশ্নের জন্য support@eidbazar.com ঠিকানায় যোগাযোগ করুন।
`,
    en: `We respect your privacy.

## 1. Information we collect
- Name, email, mobile number, shipping address
- Payment metadata (handled by our payment processors)
- Cookies and analytics data

## 2. How we use it
- To process orders and provide customer support
- To improve the site

## 3. Contact
For any questions, contact support@eidbazar.com.
`,
  },
  terms: {
    bn: `Eid Bazar ব্যবহার করার মাধ্যমে আপনি নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন।

## ১. অ্যাকাউন্ট
সঠিক তথ্য প্রদান করুন এবং আপনার পাসওয়ার্ড গোপন রাখুন।

## ২. অর্ডার
সব অর্ডার বাংলাদেশী টাকায় (৳) প্রদর্শিত হয়। আমরা যেকোনো অর্ডার বাতিল করার অধিকার সংরক্ষণ করি।

## ৩. বুদ্ধিবৃত্তিক সম্পত্তি
সাইটের সমস্ত কনটেন্ট Eid Bazar এর সম্পত্তি।
`,
    en: `By using Eid Bazar you agree to these terms.

## 1. Accounts
Provide accurate information and keep your password confidential.

## 2. Orders
All prices are in BDT (৳). We may cancel any order at our discretion.

## 3. Intellectual property
All site content is the property of Eid Bazar.
`,
  },
  "refund-policy": {
    bn: `আপনি যা কিনছেন তা যেন পছন্দ করেন — কিছু ঠিক না হলে আমরা সমাধান করব।

## ১. যোগ্যতা
- ডেলিভারির ৭ দিনের মধ্যে ফেরতের অনুরোধ জানাতে হবে
- পণ্য অব্যবহৃত ও মূল প্যাকেজিংসহ ফেরত দিতে হবে

## ২. রিফান্ড অনুরোধ
support@eidbazar.com ঠিকানায় অর্ডার আইডি ও কারণ পাঠান।

## ৩. প্রক্রিয়াকরণ
অনুমোদিত রিফান্ড ৭–১০ কর্মদিবসের মধ্যে ফেরত দেওয়া হবে।
`,
    en: `We want you to love what you buy — if something isn't right, we'll make it right.

## 1. Eligibility
- Return requests must be raised within 7 days of delivery
- Items must be unused and returned with original packaging

## 2. Request a refund
Email support@eidbazar.com with your order ID and the reason.

## 3. Processing
Approved refunds are issued within 7–10 business days.
`,
  },
};

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(POLICY_SLUGS as readonly string[]).includes(slug)) notFound();
  const typedSlug = slug as PolicySlug;
  const meta = POLICY_META[typedSlug];
  const doc = await getPolicyDoc(typedSlug);

  const initial = {
    titleEn: doc?.titleEn ?? meta.title,
    titleBn: doc?.titleBn ?? meta.titleBn,
    bodyEn: doc?.bodyEn ?? DEFAULT_BODY[typedSlug].en,
    bodyBn: doc?.bodyBn ?? DEFAULT_BODY[typedSlug].bn,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/policies"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All legal pages
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {meta.title}{" "}
            <span className="text-base text-muted-foreground" lang="bn">
              · {meta.titleBn}
            </span>
          </h1>
          {!doc && (
            <p className="mt-1 text-xs text-muted-foreground">
              Using built-in default content. Save once to take over from the
              defaults.
            </p>
          )}
        </div>
        <Link
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          View public page <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="mt-6">
        <PolicyEditor slug={slug} initial={initial} />
      </div>
    </div>
  );
}
