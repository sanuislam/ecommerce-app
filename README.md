# Eid Bazar — Full-stack e-commerce

A production-shaped, fully-featured e-commerce application built with Next.js 16
App Router, TypeScript, shadcn/ui (Nova preset), Prisma + PostgreSQL, Sanity
Studio, NextAuth, Framer Motion, lucide-react + react-icons, axios, Zustand,
and Stripe (test mode).

## Tech stack

| Area | Stack |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) App Router, React 19, TypeScript |
| UI | [shadcn/ui](https://ui.shadcn.com) (Nova), Tailwind CSS v4, Framer Motion |
| Icons | lucide-react, react-icons |
| Auth | [NextAuth v5](https://authjs.dev) credentials provider + role-based proxy |
| Data | [Prisma 7](https://www.prisma.io) + PostgreSQL (Neon or any Postgres) |
| CMS | [Sanity](https://www.sanity.io) (Studio embedded at `/studio`) |
| State | [Zustand](https://zustand.docs.pmnd.rs) with `persist` middleware |
| HTTP | axios |
| Payments | bKash Tokenized Checkout, mobile banking (bKash gateway, Upay merchant gateway; Nagad / Rocket shown as coming soon), cash on delivery |

## Features

**Storefront** (fully responsive: 320px phones → large desktops)

- Home with hero/banner carousel, flash deals (discount is really charged), category grid, featured and new-arrival rails
- Catalog with search, category chips, price range, in-stock / on-sale filters, sort and pagination; filter sheet on phones
- Product page: swipeable gallery, **size / colour options** with per-option stock and price, stock-capped quantity,
  **Buy now**, **Order on WhatsApp**, wishlist, sticky buy bar on phones, verified-buyer reviews, related products
- Cart that re-checks prices and stock with the server
- Checkout for Bangladesh: saved addresses, 64-district picker (delivery zone and fee come from the district),
  required 01XXXXXXXXX phone, **coupon codes**, order note; bKash and Upay gateways (no manual "Send Money"),
  cash on delivery, optional card (Stripe). Prices are VAT-inclusive.
- Order tracking page with progress steps, courier + tracking number, history timeline, customer self-cancel while pending
- My account: profile, address book, change password; wishlist page
- Phone bottom tab bar, safe-area aware layout, 40px+ touch targets on touch screens

**Admin dashboard** (`/admin`, for the owner (`ADMIN`) and staff (`STAFF`), works on phones)

- Products CRUD with size/colour option editor (stock per option)
- Orders: status filter + search, allowed-transition status changes (cancel restocks automatically),
  courier + tracking number, timeline, bKash and Upay refunds
- Orders back office: filters (status, payment, courier, dates), pagination, bulk status changes, CSV export,
  printable invoices and packing slips (`/print/orders`), phone / social orders typed in by an admin
  (`/admin/orders/new`), editing an order before it ships
- Couriers (Admin → Couriers): Steadfast, Pathao and RedX booking (single or bulk), webhooks at
  `/api/couriers/webhook/<courier>/<key>`, status sync in the daily cron; a delivered parcel marks the order delivered
- Customer SMS through Alpha SMS / sms.net.bd (Admin → SMS): order received, shipped, delivered, cancelled — once
  per order (`SmsLog`), editable templates, manual messages from an order
- Cash on delivery protection (Admin → Order rules): optional SMS code at checkout (`OtpCode`, hashed, 10 min,
  5 tries), COD total limit, blocked numbers (`BlockedPhone`, online payment only), "To confirm" call list with
  Confirmed / No answer / Fake (cancel + block), per-phone delivery success rate on orders
- Returns and exchanges: customers ask from a delivered order within the return window; Admin → Returns approves /
  rejects, receives (optional restock), refunds part or all (bKash / Upay gateway or recorded by hand, capped by
  `Order.refundedAmount`), and creates a free replacement order for exchanges
- Inventory (Admin → Inventory): every stock change is a `StockMovement` (sale, cancel, return, exchange, edit,
  adjustment, CSV import) with who and why; low / out-of-stock lists (per-product or shop-wide warning level),
  stock value at cost and price, manual adjustments (add or set counted stock, row-locked)
- Cost prices on products and options, copied to each order line (`OrderItem.costPrice`); order page and dashboard
  show profit after discounts, refunds and courier charges
- Products CSV (Admin → Import / export): export, edit, import with a checked preview (update by id / SKU, new
  products and options, categories by name); bulk publish / hide / category / price % / tags; tags work as
  collections at `/products?tag=<tag>`
- Coupons: percent / fixed, minimum spend, max discount, usage limits, validity window
- Categories, users (role switcher), legal pages, payments (bKash, Upay), SEO & PWA, site settings incl. delivery charges
- Staff (Admin → Staff, owner only): add people by e-mail with a role — Manager, Order staff, Inventory staff,
  Content staff (`src/lib/permissions.ts`); new e-mails get a one-time link (7 days) to set a password. The proxy
  checks every `/admin`, `/print` and `/api/admin` path against the role, route handlers check again
  (`adminSession("<permission>")`), and the menu shows only allowed pages. Settings, payments, couriers, SMS setup,
  staff and the audit log stay with owners
- Audit log (Admin → Audit log, owner only): every admin change — orders, refunds, returns, products, stock,
  coupons, settings, roles, staff, security — with who, when, IP and details (`AuditLog`, append-only; secret-looking
  fields are hidden). Filter by area, person, text or one order / product's history
- Two-factor sign-in (Admin → My security): authenticator app (TOTP), secret encrypted with `AUTH_SECRET`,
  8 one-time recovery codes (hashed). The owner can require it for everyone (Admin → Staff); until someone turns it
  on they only reach My security. The owner can reset a staff member's two-factor
- Reports (Admin → Reports): any date range (Dhaka days) vs the period before — sales, orders, average order,
  profit, items, new vs returning customers, cancellations, refunds; sales per day chart; payment method, order
  source, district, top products (with profit), categories, courier success rate, coupons; CSV export
- Customers (Admin → Customers): spend, orders and last order per customer; groups (buyers, repeat, new, recent,
  lapsed, never ordered, top spenders) filtered by district / category bought; CSV export; promotional-SMS opt-out
  (customers also switch it on My account)
- Abandoned carts (Admin → Abandoned carts): a signed-in shopper's cart is saved (`CartSnapshot`); carts idle for N
  hours get a reminder SMS (by hand, or daily at 11:00 Dhaka via `/api/cron/cart-reminders`), at most two per cart,
  with an optional coupon; the link `/cart/restore/<id>` refills the cart and opens checkout with the coupon;
  orders placed within 7 days of a reminder count as recovered
- SMS campaigns (Admin → SMS campaigns): promotional SMS to a customer group with a cost estimate (GSM / Unicode
  parts), a test send, opt-outs left out, one campaign at a time, progress and results per campaign
- Pixel & analytics: Facebook Pixel, GA4 and GTM get ViewContent / AddToCart / InitiateCheckout / Purchase
  (`src/lib/track.ts`); the Facebook Conversions API sends Purchase from the server (hashed customer data, same
  event id as the browser, once per order via `Order.trackedAt`); product feed for Facebook / Google catalogues at
  `/feeds/products.xml` (one item per size / colour)
- Honest storefront: payment logos, "ways to pay", trust badges, return window, free-delivery line and the
  flash-sale countdown are built from real settings (`src/lib/store-facts.ts`); reviews on the home page are real
  ones from delivered orders; newsletter gives the coupon set in Settings (shown + e-mailed); Tawk.to chat ID,
  support hours and flash-sale end are in Admin → Settings
- Order numbers customers can read and say on the phone (`EB-10001`, `Order.number`), searchable in Admin → Orders;
  customer-facing statuses ("Order placed", "Awaiting payment", "Confirmed", "On the way"…)
- `/track`: order status by order number + phone, no sign-in (SMS `{link}` points here); `/contact` form →
  Admin → Messages (e-mailed to support when e-mail is set up)
- Sign in with a mobile number + 6-digit SMS code (`phone-otp` provider, `/api/login-code`): the same step creates
  the account; staff accounts must use e-mail + password (+ two-factor). "Continue with Google" appears when
  `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are set (customer accounts only)
- The cart follows the account: on sign-in the saved cart is merged into this browser's cart
- Cart page: free-delivery progress, delivery charges, coupon (carried to checkout), best sellers when empty
- Passwords: `/forgot-password` e-mails a one-time link (60 min, only its SHA-256 stored) through Resend, or sends it
  by SMS to the account's phone when e-mail isn't set up; the owner can make a 24-hour link for anyone from Users /
  Staff. Changing or resetting a password signs that account out everywhere within a minute

**Safety**

- Every price, discount and delivery fee is calculated on the server; stock and coupon usage change atomically
- bKash callback verifies the payment belongs to the order and the paid amount matches before marking it paid
- Upay: the redirect's query string is never trusted — the result is read back from Upay's
  single-payment-status API (txn_id = order id, amount and invoice must match); the expiry job asks
  Upay before cancelling an abandoned Upay order
- Status changes are guarded so double callbacks / double clicks can't restock or refund twice
- Rate limits on sign-in, sign-up, checkout, reviews and password changes (stored in Postgres)
- Role, staff role and the two-factor rule are re-read from the database every minute, so removed staff lose access
  quickly; a password change ends older sessions
- Abandoned online-payment orders are cancelled after 60 minutes (cron + lazy cleanup)

**SEO**

- Canonical URLs from `NEXT_PUBLIC_SITE_URL` (or Vercel's production domain automatically)
- Server-rendered JSON-LD: OnlineStore, WebSite + SearchAction, Product with Offer/AggregateOffer,
  shipping & return policy, reviews, BreadcrumbList, ItemList
- Clean category pages at `/category/<slug>`; searches/filters are `noindex` to avoid duplicates
- Dynamic sitemap (products with images, categories), robots rules, previews blocked from indexing
- Brand "E" logo, favicon set, app icons and a default 1200×630 share image (`/og-default.png`)

**Demo catalogue**

- 48 products in 11 Eid categories with real photos and size options:
  **Admin → Products → Load demo products** (or `npm run db:seed` locally). Can be removed with one click.

**Content**

- Sanity Studio embedded at `/studio` with product/category/banner schemas
- Home hero reads optional banners from Sanity (falls back to defaults)

## Requirements

- Node.js 20+ (tested on 22.12)
- PostgreSQL 14+ (local or hosted)
- npm 10+

## Environment

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"

NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Optional — leave as placeholders for demo mode
NEXT_PUBLIC_SANITY_PROJECT_ID="placeholder"
NEXT_PUBLIC_SANITY_DATASET="production"
SANITY_API_TOKEN=""

STRIPE_SECRET_KEY="sk_test_replace_me"
STRIPE_WEBHOOK_SECRET="whsec_replace_me"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_replace_me"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional — password reset and staff invite e-mails (https://resend.com)
RESEND_API_KEY=""
MAIL_FROM="Eid Bazar <no-reply@yourdomain.com>"
```

> **Payment methods shown at checkout**
> - Cash on delivery is always available.
> - bKash gateway appears when credentials are saved in **Admin → Payments** (or `BKASH_*` env vars).
> - Upay gateway appears when it is enabled with merchant ID, key, name, code and mobile in
>   **Admin → Payments** (test base URL `https://uat-pg.upay.systems`); checkout shows it as
>   "Mobile banking" with bKash, Nagad and Upay icons. Manual "Send Money" + TrxID was removed.
> - Card payment appears only with real Stripe keys.
>
> Set `CRON_SECRET` so `/api/cron/expire-orders` (scheduled in `vercel.json`) can release stock
> from abandoned online payments.

## Getting started

```bash
npm install
npm run db:migrate   # runs prisma migrate dev and generates client
npm run db:seed      # seeds categories, products (with size/colour options), admin + user, coupon EID10
npm run dev
```

The database driver is picked from `DATABASE_URL`: Neon URLs use the Neon
serverless driver, anything else (e.g. a local Postgres) uses `pg`. Override
with `DATABASE_DRIVER=neon|pg`.

**Deploying on Vercel:** Vercel runs the `vercel-build` script, which applies
database migrations (`prisma migrate deploy`) before building — but only for
production deployments, so preview branches never touch the live database.
If a migration fails, the build fails and the previous deployment stays live.
On Neon, migrations use `DATABASE_URL_UNPOOLED` (or `DIRECT_URL`) when set.
Outside Vercel, run `npm run db:deploy` yourself before starting the new build.

Then open [http://localhost:3000](http://localhost:3000).

### Seeded accounts

| Role  | Email                  | Password   |
| ----- | ---------------------- | ---------- |
| Admin | admin@eidbazar.com    | admin1234  |
| User  | user@eidbazar.com     | user1234   |

Sign in as the admin to reach `/admin`. The seed refuses to run with
`NODE_ENV=production`; set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for any shared database.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build + typecheck |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:seed` | Seed demo data |

## Project layout

```
prisma/
  schema.prisma          # User, Product, Category, Cart, Order, Review, Address, ...
  seed.ts                # Demo data + admin/user accounts

sanity/
  schemas/               # product, category, banner schemas
sanity.config.ts         # Studio config (used by /studio route)

src/
  app/
    (auth)/              # sign-in, sign-up
    (shop)/              # storefront layout + pages
    admin/               # admin dashboard
    api/                 # REST route handlers
    studio/[[...tool]]/  # Sanity Studio mount
  components/            # UI, admin forms, site chrome
  generated/prisma/      # Prisma generated client
  lib/                   # prisma, auth, stripe, sanity, utils, axios
  store/cart.ts          # Zustand cart store
  proxy.ts               # Next.js 16 proxy (role-based route protection)
  auth.ts                # NextAuth v5 config
```

## Notes

- Next.js 16 renamed `middleware` → `proxy`. Route protection lives in
  `src/proxy.ts` and guards `/admin`, `/account`, `/orders`, `/checkout`.
- Async Request APIs (`params`, `searchParams`, `cookies()`, `headers()`) must
  be awaited — all route handlers and pages follow this convention.
- Prisma's generated client is committed to `src/generated/prisma` and ignored
  by ESLint / typecheck.
- Sanity project ID defaults to `"placeholder"`; `/studio` still mounts but
  will show a setup prompt until real credentials are provided.
