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
| Data | [Prisma v6](https://www.prisma.io) + PostgreSQL |
| CMS | [Sanity](https://www.sanity.io) (Studio embedded at `/studio`) |
| State | [Zustand](https://zustand.docs.pmnd.rs) with `persist` middleware |
| HTTP | axios |
| Payments | Stripe Checkout (test mode), webhook at `/api/stripe/webhook` |

## Features

**Storefront**

- Home with animated hero, category grid, featured and new-arrival rails
- Catalog with search, category filter, and sort
- Product detail with gallery, reviews, trust badges, add-to-cart
- Cart with Zustand + localStorage, quantity controls, totals
- Stripe checkout (or demo mode when Stripe keys are placeholders)
- Orders list and order detail pages
- Sign-in / sign-up with NextAuth credentials

**Admin dashboard** (`/admin`, requires `ADMIN` role)

- Overview with revenue, orders, product, and user stats
- Products CRUD (create / edit / delete, featured + published flags)
- Categories CRUD
- Orders list and detail with status updates
- Users list with role switcher

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

> Checkout works in a **demo mode** when `STRIPE_SECRET_KEY` is still a
> placeholder — orders are created without a payment redirect. Set real
> `sk_test_...` keys to enable Stripe Checkout.

## Getting started

```bash
npm install
npm run db:migrate   # runs prisma migrate dev and generates client
npm run db:seed      # seeds categories, products, admin + user accounts
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Seeded accounts

| Role  | Email                  | Password   |
| ----- | ---------------------- | ---------- |
| Admin | admin@eidbazar.com    | admin1234  |
| User  | user@eidbazar.com     | user1234   |

Sign in as the admin to reach `/admin`.

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
