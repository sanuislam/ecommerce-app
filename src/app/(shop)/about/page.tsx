export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">About Eid Bazar</h1>
      <p className="mt-4 text-muted-foreground">
        Eid Bazar is a demo full-stack e-commerce experience built with Next.js,
        shadcn/ui, Prisma + PostgreSQL, Sanity, Framer Motion, lucide-react,
        react-icons, and Stripe. It showcases a modern storefront and a complete
        admin dashboard with role-based access control.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Storefront</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Home, listings, product detail, cart, and Stripe checkout — animated with Framer Motion.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Admin</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Product, category, order, and user management with shadcn tables and forms.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Content</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sanity Studio embedded at <code>/studio</code> for banners and additional content.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prisma + PostgreSQL, NextAuth with credentials, Zustand cart, axios client.
          </p>
        </div>
      </div>
    </div>
  );
}
