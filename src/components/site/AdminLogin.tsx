"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.status === 429 ? "Too many attempts. Try again later." : "Wrong password.");
  };
  return (
    <form onSubmit={submit} className="card mt-4 grid gap-3 p-5">
      <input name="password" type="password" required autoFocus placeholder="Admin password" className="w-full rounded-md border border-line px-3 py-2.5 outline-none focus:border-steel" autoComplete="current-password" />
      {error && <p className="text-sm text-red">{error}</p>}
      <button type="submit" disabled={busy} className="btn-dark disabled:opacity-60">
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-outline btn-sm"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
