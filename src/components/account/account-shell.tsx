import { AccountNav } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/account/sign-out-button";

/** The frame of every "My account" page: menu + the page's own content. */
export function AccountShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[200px_1fr] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
          <AccountNav />
          <div className="mt-4 hidden lg:block">
            <SignOutButton />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {action}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
