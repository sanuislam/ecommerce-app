"use client";

import { motion } from "framer-motion";

type Brand = {
  name: string;
  // Inline SVG logo or stylized text mark.
  mark: React.ReactNode;
  // Background gradient classes for the chip.
  bg: string;
};

const VisaMark = (
  <svg viewBox="0 0 80 24" className="h-5 w-auto" aria-hidden>
    <text
      x="0"
      y="19"
      fontFamily="Helvetica, Arial, sans-serif"
      fontWeight="900"
      fontStyle="italic"
      fontSize="22"
      fill="#1A1F71"
      letterSpacing="-0.5"
    >
      VISA
    </text>
  </svg>
);

const MastercardMark = (
  <svg viewBox="0 0 48 30" className="h-6 w-auto" aria-hidden>
    <circle cx="18" cy="15" r="11" fill="#EB001B" />
    <circle cx="30" cy="15" r="11" fill="#F79E1B" />
    <path
      d="M24 6.7a10.95 10.95 0 0 1 0 16.6 10.95 10.95 0 0 1 0-16.6Z"
      fill="#FF5F00"
    />
  </svg>
);

const AmexMark = (
  <svg viewBox="0 0 60 24" className="h-5 w-auto" aria-hidden>
    <rect width="60" height="24" rx="3" fill="#1F72CD" />
    <text
      x="30"
      y="16"
      textAnchor="middle"
      fontFamily="Helvetica, Arial, sans-serif"
      fontWeight="900"
      fontStyle="italic"
      fontSize="9"
      fill="#FFFFFF"
      letterSpacing="0.5"
    >
      AMERICAN
    </text>
    <text
      x="30"
      y="22"
      textAnchor="middle"
      fontFamily="Helvetica, Arial, sans-serif"
      fontWeight="900"
      fontStyle="italic"
      fontSize="6"
      fill="#FFFFFF"
      letterSpacing="0.4"
    >
      EXPRESS
    </text>
  </svg>
);

function TextMark({
  text,
  color,
  italic = false,
}: {
  text: string;
  color: string;
  italic?: boolean;
}) {
  return (
    <span
      className={`text-base font-extrabold tracking-tight ${italic ? "italic" : ""}`}
      style={{ color, fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {text}
    </span>
  );
}

const PAYMENT_BRANDS: Brand[] = [
  {
    name: "bKash",
    mark: <TextMark text="bKash" color="#FFFFFF" italic />,
    bg: "bg-[#E2136E]",
  },
  {
    name: "Nagad",
    mark: <TextMark text="Nagad" color="#FFFFFF" italic />,
    bg: "bg-[#EC1C24]",
  },
  {
    name: "Rocket",
    mark: <TextMark text="Rocket" color="#FFFFFF" italic />,
    bg: "bg-[#8B2890]",
  },
  {
    name: "Upay",
    mark: <TextMark text="upay" color="#FFFFFF" italic />,
    bg: "bg-gradient-to-br from-[#00B5E2] to-[#005FAA]",
  },
  {
    name: "Cash on Delivery",
    mark: <TextMark text="COD" color="#1F2937" />,
    bg: "bg-emerald-100",
  },
];

const CARD_BRANDS: Brand[] = [
  { name: "Visa", mark: VisaMark, bg: "bg-white" },
  { name: "Mastercard", mark: MastercardMark, bg: "bg-white" },
  { name: "American Express", mark: AmexMark, bg: "bg-white" },
];

const BANK_BRANDS: Brand[] = [
  {
    name: "Dutch-Bangla Bank",
    mark: <TextMark text="DBBL" color="#003E7E" />,
    bg: "bg-white",
  },
  {
    name: "BRAC Bank",
    mark: <TextMark text="BRAC" color="#0033A0" />,
    bg: "bg-white",
  },
  {
    name: "City Bank",
    mark: <TextMark text="CITY" color="#A6192E" />,
    bg: "bg-white",
  },
  {
    name: "Islami Bank",
    mark: <TextMark text="IBBL" color="#00563F" />,
    bg: "bg-white",
  },
  {
    name: "EBL",
    mark: <TextMark text="EBL" color="#0E3B8C" />,
    bg: "bg-white",
  },
  {
    name: "Sonali Bank",
    mark: <TextMark text="Sonali" color="#1B5E20" />,
    bg: "bg-white",
  },
];

function BrandChip({ brand }: { brand: Brand }) {
  return (
    <li
      className={`flex h-12 min-w-[88px] items-center justify-center rounded-md border border-foreground/10 px-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${brand.bg}`}
      title={brand.name}
      aria-label={brand.name}
    >
      {brand.mark}
    </li>
  );
}

export function PaymentsStrip() {
  return (
    <section className="border-t bg-gradient-to-b from-muted/30 to-muted/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Payment We Accept
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mobile financial services, major bank cards, and cash on delivery —
            all secured by SSL.
          </p>
        </motion.div>

        <div className="mt-8 space-y-6">
          <BrandRow title="Mobile Financial Services" brands={PAYMENT_BRANDS} />
          <BrandRow title="Cards" brands={CARD_BRANDS} />
          <BrandRow title="Bank Cards Accepted" brands={BANK_BRANDS} />
        </div>
      </div>
    </section>
  );
}

function BrandRow({ title, brands }: { title: string; brands: Brand[] }) {
  return (
    <div>
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {brands.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
          >
            <BrandChip brand={b} />
          </motion.div>
        ))}
      </ul>
    </div>
  );
}
