import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function safeCallbackUrl(url: string | undefined): string {
  if (!url) return "/";
  // Only allow same-origin relative paths; reject protocol-relative (//evil.com)
  // and absolute URLs.
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return "/";
}

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const safeUrl = safeCallbackUrl(callbackUrl);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue shopping.
        </p>
        <SignInForm callbackUrl={safeUrl} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
