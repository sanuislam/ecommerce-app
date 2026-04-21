import { PolicyPage } from "@/components/site/policy-page";
import { SITE_CONFIG } from "@/lib/site-config";

const UPDATED_AT = "April 21, 2026";

export const metadata = {
  title: "Privacy Policy — Eid Bazar",
  description:
    "How Eid Bazar collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      titleBn="গোপনীয়তা নীতি"
      updatedAt={UPDATED_AT}
      en={
        <>
          <p>
            This Privacy Policy explains how {SITE_CONFIG.name} (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, discloses and
            protects your personal information when you use our website and
            services.
          </p>

          <h2>1. Information we collect</h2>
          <ul>
            <li>Account details: name, email, hashed password.</li>
            <li>
              Order details: shipping address, phone, items purchased, order
              amount.
            </li>
            <li>
              Payment information is processed by Stripe; we never store your
              full card number.
            </li>
            <li>
              Technical data: device, browser, IP address and usage analytics.
            </li>
          </ul>

          <h2>2. How we use your information</h2>
          <ul>
            <li>To create and manage your account.</li>
            <li>To process orders and deliver products.</li>
            <li>To send transactional emails (order confirmations, receipts).</li>
            <li>To detect and prevent fraud or abuse.</li>
          </ul>

          <h2>3. Sharing</h2>
          <p>
            We share the minimum information required with payment processors,
            shipping partners and, when legally required, with authorities.
            We do not sell your personal data.
          </p>

          <h2>4. Your rights</h2>
          <p>
            You may request a copy, correction or deletion of your personal
            data at any time by contacting{" "}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
              {SITE_CONFIG.supportEmail}
            </a>
            .
          </p>

          <h2>5. Contact</h2>
          <p>
            Questions about this policy? Email{" "}
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
            এই গোপনীয়তা নীতি ব্যাখ্যা করে যে {SITE_CONFIG.name} (&ldquo;আমরা&rdquo;)
            আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার, প্রকাশ ও সুরক্ষিত করে যখন আপনি
            আমাদের ওয়েবসাইট ও পরিষেবা ব্যবহার করেন।
          </p>

          <h2>১. আমরা যে তথ্য সংগ্রহ করি</h2>
          <ul>
            <li>অ্যাকাউন্টের তথ্য: নাম, ইমেইল, এনক্রিপ্টেড পাসওয়ার্ড।</li>
            <li>
              অর্ডারের তথ্য: ঠিকানা, ফোন নম্বর, কেনা পণ্য ও মোট পরিমাণ।
            </li>
            <li>
              পেমেন্ট তথ্য Stripe-এর মাধ্যমে প্রক্রিয়াজাত হয়; আমরা কখনো আপনার
              সম্পূর্ণ কার্ড নম্বর সংরক্ষণ করি না।
            </li>
            <li>
              প্রযুক্তিগত তথ্য: ডিভাইস, ব্রাউজার, IP ঠিকানা ও ব্যবহার বিশ্লেষণ।
            </li>
          </ul>

          <h2>২. তথ্য ব্যবহারের উদ্দেশ্য</h2>
          <ul>
            <li>আপনার অ্যাকাউন্ট তৈরি ও পরিচালনা করতে।</li>
            <li>অর্ডার প্রক্রিয়াজাত ও পণ্য পৌঁছে দিতে।</li>
            <li>লেনদেনমূলক ইমেইল (অর্ডার কনফার্মেশন, রসিদ) পাঠাতে।</li>
            <li>প্রতারণা বা অপব্যবহার শনাক্ত ও প্রতিরোধ করতে।</li>
          </ul>

          <h2>৩. তথ্য ভাগাভাগি</h2>
          <p>
            পেমেন্ট প্রসেসর, শিপিং অংশীদার এবং আইনগতভাবে প্রয়োজন হলে কর্তৃপক্ষের
            সাথে ন্যূনতম প্রয়োজনীয় তথ্য শেয়ার করা হয়। আপনার ব্যক্তিগত তথ্য
            আমরা কখনোই বিক্রি করি না।
          </p>

          <h2>৪. আপনার অধিকার</h2>
          <p>
            আপনি যেকোনো সময়{" "}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`}>
              {SITE_CONFIG.supportEmail}
            </a>{" "}
            ঠিকানায় যোগাযোগ করে ব্যক্তিগত তথ্যের কপি, সংশোধন বা মুছে ফেলার
            অনুরোধ করতে পারেন।
          </p>

          <h2>৫. যোগাযোগ</h2>
          <p>
            এই নীতি সম্পর্কে প্রশ্ন থাকলে{" "}
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
