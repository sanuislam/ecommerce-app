import Link from "next/link";

export const metadata = {
  title: "You are offline",
  description: "Reconnect to keep shopping on Eid Bazar.",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 p-5 shadow-sm">
        <svg
          className="size-12 text-rose-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We can&apos;t reach Eid Bazar right now. Reconnect to the internet and try
        again — your cart and saved items are safe.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Try again
      </Link>
    </div>
  );
}
