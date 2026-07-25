"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const [busy, setBusy] = useState<"github" | "google" | null>(null);

  async function oauth(provider: "github" | "google") {
    setBusy(provider);
    await signIn(provider, { callbackUrl: next });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel w-full max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-display">Enter the realm</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Sign in to save your kingdom and add a Gemini key for Coach. Or continue as a guest —
            progress will not be saved.
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy !== null}
            onClick={() => void oauth("github")}
          >
            {busy === "github" ? "Opening GitHub…" : "Continue with GitHub"}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            disabled={busy !== null}
            onClick={() => void oauth("google")}
          >
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
        </div>
        <Link href={next} className="btn-ghost w-full text-center block">
          Continue as guest
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-sm text-[var(--ink-muted)]">
          Opening the gates…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
