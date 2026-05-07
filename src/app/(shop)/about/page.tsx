export const metadata = {
  title: "আমাদের সম্পর্কে",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">
        আমাদের সম্পর্কে
      </h1>

      <p className="mt-4 leading-7 text-muted-foreground">
        স্বাগতম <span className="font-semibold text-foreground">EID BAZAR</span>{" "}
        এ — আপনার বিশ্বস্ত অনলাইন শপিং প্ল্যাটফর্ম।
        <br />
        <br />
        আমরা বিশ্বাস করি সাশ্রয়ী মূল্যে মানসম্মত পণ্য সবার কাছে পৌঁছে দেওয়াই
        আমাদের প্রধান লক্ষ্য। EID BAZAR এ আপনি পাবেন দৈনন্দিন প্রয়োজনীয়
        বিভিন্ন পণ্য, ফ্যাশন আইটেম, বেবি কালেকশন, লাইফস্টাইল প্রোডাক্টসহ আরও
        অনেক কিছু — সব এক জায়গায়।
        <br />
        <br />
        আমরা প্রতিটি পণ্যের গুণগত মান, সঠিক মূল্য এবং দ্রুত ডেলিভারি নিশ্চিত
        করার চেষ্টা করি যাতে আপনি ঘরে বসেই নিরাপদ ও সহজ শপিং অভিজ্ঞতা উপভোগ
        করতে পারেন।
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">মানসম্মত পণ্য</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            বাছাইকৃত ও নির্ভরযোগ্য পণ্য সরবরাহ করাই আমাদের অঙ্গীকার।
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">সাশ্রয়ী মূল্য</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            গ্রাহকদের জন্য সর্বোত্তম দামে পণ্য প্রদান করার চেষ্টা করি।
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">দ্রুত ডেলিভারি</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            নিরাপদ ও দ্রুত সময়ে আপনার অর্ডার পৌঁছে দেওয়াই আমাদের লক্ষ্য।
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">কাস্টমার সাপোর্ট</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            যেকোনো প্রয়োজনে আমাদের সাপোর্ট টিম সবসময় সহায়তার জন্য প্রস্তুত।
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">আমাদের লক্ষ্য</h2>

        <p className="mt-3 leading-7 text-muted-foreground">
          আমাদের লক্ষ্য শুধু পণ্য বিক্রি নয়, বরং একটি বিশ্বস্ত, সহজ এবং
          আনন্দদায়ক অনলাইন শপিং অভিজ্ঞতা তৈরি করা।
          <br />
          <br />
          আপনাদের ভালোবাসা ও আস্থাই আমাদের এগিয়ে যাওয়ার অনুপ্রেরণা।
          ধন্যবাদ EID BAZAR এর সাথে থাকার জন্য ❤️
        </p>
      </div>
    </div>
  );
}
