import { PolicyPage } from "@/components/site/policy-page";
import { SITE_CONFIG } from "@/lib/site-config";

const UPDATED_AT = "April 21, 2026";

export const metadata = {
  title: "Terms & Conditions — Eid Bazar",
  description:
    "The terms and conditions that govern the use of Eid Bazar and its services.",
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      titleBn="ব্যবহারের শর্তাবলি"
      updatedAt={UPDATED_AT}
      en={
        <>
          <p>
            By accessing or using {SITE_CONFIG.name}, you agree to these Terms
            &amp; Conditions. If you do not agree, please do not use the site.
          </p>

          <h2>1. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity on your account.
          </p>

          <h2>2. Orders & pricing</h2>
          <ul>
            <li>
              All prices are listed in Bangladeshi Taka (BDT) and are inclusive
              of applicable taxes unless otherwise stated.
            </li>
            <li>
              We reserve the right to refuse or cancel any order, including in
              cases of inventory error, suspected fraud, or pricing mistake.
            </li>
            <li>
              Orders are confirmed once you receive an order confirmation
              email.
            </li>
          </ul>

          <h2>3. Shipping</h2>
          <p>
            Delivery times are estimates and depend on your location and the
            shipping partner. Free shipping applies to orders over ৳1,000.
          </p>

          <h2>4. Intellectual property</h2>
          <p>
            All content on the site, including text, logos, graphics and
            product images, is owned by {SITE_CONFIG.name} or its licensors and
            may not be reused without permission.
          </p>

          <h2>5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, {SITE_CONFIG.name} will not
            be liable for any indirect, incidental or consequential damages
            arising from your use of the service.
          </p>

          <h2>6. Changes to these terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the
            site after changes are posted constitutes acceptance of the new
            Terms.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions about these terms? Email{" "}
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
            {SITE_CONFIG.name}-এ প্রবেশ বা ব্যবহারের মাধ্যমে আপনি এই ব্যবহারের
            শর্তাবলিতে সম্মত হচ্ছেন। আপনি যদি একমত না হন, অনুগ্রহ করে এই
            ওয়েবসাইট ব্যবহার করবেন না।
          </p>

          <h2>১. অ্যাকাউন্ট</h2>
          <p>
            আপনার অ্যাকাউন্টের গোপনীয়তা রক্ষা এবং অ্যাকাউন্টের মাধ্যমে সম্পাদিত
            সকল কার্যক্রমের দায়িত্ব আপনার।
          </p>

          <h2>২. অর্ডার ও মূল্য</h2>
          <ul>
            <li>
              সকল মূল্য বাংলাদেশি টাকায় (BDT) প্রদর্শিত এবং অন্যথা উল্লেখ না
              থাকলে প্রযোজ্য করসহ।
            </li>
            <li>
              স্টকের ভুল, প্রতারণার সন্দেহ বা মূল্য-ভুলের ক্ষেত্রে আমরা যেকোনো
              অর্ডার প্রত্যাখ্যান বা বাতিল করার অধিকার রাখি।
            </li>
            <li>
              অর্ডার কনফার্মেশন ইমেইল পাওয়ার পর অর্ডার নিশ্চিত বলে গণ্য হবে।
            </li>
          </ul>

          <h2>৩. শিপিং</h2>
          <p>
            ডেলিভারির সময় আপনার ঠিকানা ও শিপিং পার্টনারের উপর নির্ভর করে।
            ৳১,০০০-এর বেশি অর্ডারে বিনা মূল্যে শিপিং প্রযোজ্য।
          </p>

          <h2>৪. মেধাস্বত্ব</h2>
          <p>
            সাইটের সকল কনটেন্ট — লেখা, লোগো, গ্রাফিক্স ও পণ্যের ছবি —{" "}
            {SITE_CONFIG.name} বা এর লাইসেন্সদাতাদের সম্পত্তি এবং অনুমতি ছাড়া
            পুনঃব্যবহার করা যাবে না।
          </p>

          <h2>৫. দায়বদ্ধতার সীমা</h2>
          <p>
            আইন দ্বারা অনুমোদিত সর্বোচ্চ সীমা পর্যন্ত, পরিষেবা ব্যবহারের কারণে
            সৃষ্ট কোনো পরোক্ষ, আনুষঙ্গিক বা ফলশ্রুতিমূলক ক্ষতির জন্য{" "}
            {SITE_CONFIG.name} দায়ী নয়।
          </p>

          <h2>৬. শর্তাবলি পরিবর্তন</h2>
          <p>
            আমরা সময়ে সময়ে এই শর্তাবলি হালনাগাদ করতে পারি। পরিবর্তনের পরে
            সাইট ব্যবহার চালিয়ে যাওয়া মানে নতুন শর্তাবলি গ্রহণ করা।
          </p>

          <h2>৭. যোগাযোগ</h2>
          <p>
            শর্তাবলি সম্পর্কে প্রশ্ন থাকলে{" "}
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
