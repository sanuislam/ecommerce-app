import { PolicyPage } from "@/components/site/policy-page";
import { Markdown } from "@/components/site/markdown";
import { SITE_CONFIG } from "@/lib/site-config";
import { getPolicyDoc } from "@/lib/policy-docs";

const UPDATED_AT_FALLBACK = "April 21, 2026";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Refund Policy — Eid Bazar",
  description: "Our refund, return and exchange policy.",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function RefundPolicyPage() {
  const doc = await getPolicyDoc("refund-policy");
  if (doc) {
    return (
      <PolicyPage
        title={doc.titleEn}
        titleBn={doc.titleBn}
        updatedAt={doc.updatedAt ? formatDate(doc.updatedAt) : UPDATED_AT_FALLBACK}
        en={<Markdown>{doc.bodyEn}</Markdown>}
        bn={<Markdown>{doc.bodyBn}</Markdown>}
      />
    );
  }
  return (
    <PolicyPage
      title="Refund Policy"
      titleBn="রিফান্ড নীতি"
      updatedAt={UPDATED_AT_FALLBACK}
      en={
        <>
          <p>
            We want you to love what you buy. If something isn&apos;t right,
            we&apos;ll make it right.
          </p>

          <h2>1. Eligibility</h2>
          <ul>
            <li>
              Return requests must be raised within <strong>7 days</strong> of
              delivery.
            </li>
            <li>
              Items must be unused, in original condition, and returned with
              the original packaging.
            </li>
            <li>
              Personalised, perishable or final-sale items are not eligible for
              return.
            </li>
          </ul>

          <h2>2. How to request a refund</h2>
          <ol className="list-decimal pl-6 text-muted-foreground">
            <li>
              Email{" "}
              <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
                {SITE_CONFIG.supportEmail}
              </a>{" "}
              with your order ID and the reason for the return.
            </li>
            <li>Our team will send you return instructions within 48 hours.</li>
            <li>
              Once we receive and inspect the item, we will notify you of the
              outcome.
            </li>
          </ol>

          <h2>3. Refund processing</h2>
          <p>
            Approved refunds are issued to the original payment method within
            7–10 business days. Shipping fees are non-refundable unless the
            item was defective or incorrect.
          </p>

          <h2>4. Damaged or incorrect items</h2>
          <p>
            If your order arrives damaged or you received the wrong item,
            contact us within 48 hours with photos of the item and packaging.
            We will cover return shipping and replace the product at no cost.
          </p>

          <h2>5. Contact</h2>
          <p>
            Questions about refunds? Email{" "}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
              {SITE_CONFIG.supportEmail}
            </a>
            .
          </p>
        </>
      }
      bn={
        <>
          <p>
            আপনি যা কিনছেন তা যেন আপনি পছন্দ করেন — এটাই আমাদের লক্ষ্য। কিছু
            ঠিক না হলে আমরা সেটা সমাধান করব।
          </p>

          <h2>১. যোগ্যতা</h2>
          <ul>
            <li>
              ডেলিভারির <strong>৭ দিনের</strong> মধ্যে ফেরতের অনুরোধ জানাতে
              হবে।
            </li>
            <li>
              পণ্যটি অব্যবহৃত, আসল অবস্থায় এবং মূল প্যাকেজিংসহ ফেরত দিতে হবে।
            </li>
            <li>
              ব্যক্তিগতকৃত (পার্সোনালাইজড), পচনশীল বা ফাইনাল-সেল পণ্য ফেরতের
              উপযুক্ত নয়।
            </li>
          </ul>

          <h2>২. রিফান্ড অনুরোধের উপায়</h2>
          <ol className="list-decimal pl-6 text-muted-foreground">
            <li>
              আপনার অর্ডার আইডি ও কারণ উল্লেখ করে{" "}
              <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
                {SITE_CONFIG.supportEmail}
              </a>{" "}
              ঠিকানায় ইমেইল করুন।
            </li>
            <li>আমরা ৪৮ ঘণ্টার মধ্যে ফেরত দেওয়ার নির্দেশনা পাঠাব।</li>
            <li>
              পণ্য গ্রহণ ও যাচাইয়ের পরে আমরা আপনাকে সিদ্ধান্ত জানাব।
            </li>
          </ol>

          <h2>৩. রিফান্ড প্রক্রিয়াকরণ</h2>
          <p>
            অনুমোদিত রিফান্ড মূল পেমেন্ট মাধ্যমে ৭–১০ কর্মদিবসের মধ্যে ফেরত
            দেওয়া হবে। পণ্য ত্রুটিপূর্ণ বা ভুল না হলে শিপিং ফি ফেরতযোগ্য নয়।
          </p>

          <h2>৪. ক্ষতিগ্রস্ত বা ভুল পণ্য</h2>
          <p>
            পণ্য ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে বা ভুল পণ্য পেলে ৪৮ ঘণ্টার মধ্যে
            পণ্য ও প্যাকেজিং-এর ছবিসহ আমাদের জানান। আমরা ফেরত পাঠানোর খরচ বহন
            করব এবং বিনা খরচে প্রতিস্থাপন করব।
          </p>

          <h2>৫. যোগাযোগ</h2>
          <p>
            রিফান্ড সম্পর্কে প্রশ্ন থাকলে{" "}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
              {SITE_CONFIG.supportEmail}
            </a>{" "}
            ঠিকানায় ইমেইল করুন।
          </p>
        </>
      }
    />
  );
}
