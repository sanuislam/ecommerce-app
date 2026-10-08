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
| Payments | bKash Tokenized Checkout, Upay merchant gateway, manual MFS (TrxID), cash on delivery, optional Stripe |

## Features

**Storefront** (fully responsive: 320px phones → large desktops)

- Home with hero/banner carousel, flash deals (discount is really charged), category grid, featured and new-arrival rails
- Catalog with search, category chips, price range, in-stock / on-sale filters, sort and pagination; filter sheet on phones
- Product page: swipeable gallery, **size / colour options** with per-option stock and price, stock-capped quantity,
  **Buy now**, **Order on WhatsApp**, wishlist, sticky buy bar on phones, verified-buyer reviews, related products
- Cart that re-checks prices and stock with the server
- Checkout for Bangladesh: saved addresses, 64-district picker (delivery zone and fee come from the district),
  required 01XXXXXXXXX phone, **coupon codes**, order note; bKash and Upay gateways, manual bKash/Nagad/Rocket/Upay (TrxID),
  cash on delivery, optional card (Stripe). Prices are VAT-inclusive.
- Order tracking page with progress steps, courier + tracking number, history timeline, customer self-cancel while pending
- My account: profile, address book, change password; wishlist page
- Phone bottom tab bar, safe-area aware layout, 40px+ touch targets on touch screens

**Admin dashboard** (`/admin`, requires `ADMIN` role, works on phones)

- Products CRUD with size/colour option editor (stock per option)
- Orders: status filter + search, allowed-transition status changes (cancel restocks automatically),
  courier + tracking number, timeline, bKash and Upay refunds
- Coupons: percent / fixed, minimum spend, max discount, usage limits, validity window
- Categories, users (role switcher), legal pages, payments (bKash, Upay), SEO & PWA, site settings incl. delivery charges

**Safety**

- Every price, discount and delivery fee is calculated on the server; stock and coupon usage change atomically
- bKash callback verifies the payment belongs to the order and the paid amount matches before marking it paid
- Upay: the redirect's query string is never trusted — the result is read back from Upay's
  single-payment-status API (txn_id = order id, amount and invoice must match); the expiry job asks
  Upay before cancelling an abandoned Upay order
- Status changes are guarded so double callbacks / double clicks can't restock or refund twice
- Rate limits on sign-in, sign-up, checkout, reviews and password changes (stored in Postgres)
- Admin role is re-read from the database every minute, so demoted admins lose access quickly
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
```

> **Payment methods shown at checkout**
> - Cash on delivery is always available.
> - bKash gateway appears when credentials are saved in **Admin → Payments** (or `BKASH_*` env vars).
> - Upay gateway appears when it is enabled with merchant ID, key, name, code and mobile in
>   **Admin → Payments** (test base URL `https://uat-pg.upay.systems`); it replaces manual Upay.
> - Manual "Send Money" methods (bKash/Nagad/Rocket/Upay) appear only when their
>   `NEXT_PUBLIC_*_NUMBER` receiving number is set — so customers never pay a placeholder number.
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
