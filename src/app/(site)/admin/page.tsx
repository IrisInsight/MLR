import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-auth";
import { listLeads, listQuestions, storageMode, topQuestions } from "@/lib/leads";
import { AdminLogin, LogoutButton } from "@/components/site/AdminLogin";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isValidAdminToken(token)) {
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-sm">
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-1 text-3xl">Sign in</h1>
          <AdminLogin />
        </div>
      </div>
    );
  }
  const mode = storageMode();
  const [leads, questions] = await Promise.all([listLeads(200), listQuestions(1000)]);
  const top = topQuestions(questions, 30);
  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-1 text-4xl">Leads &amp; questions</h1>
        </div>
        <LogoutButton />
      </div>
      {mode === "demo" ? (
        <p className="mt-4 rounded-card border border-safety/60 bg-safety/15 px-4 py-3 text-sm">
          <strong>Demo mode.</strong> Connect a Blob store to save leads: add a Vercel Blob store to the project so <code>BLOB_READ_WRITE_TOKEN</code> is set. Until then leads are logged server-side and kept in memory only.
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">Stored as private objects in Vercel Blob.</p>
      )}

      <section className="mt-8">
        <h2 className="display text-2xl">Leads ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="mt-2 text-ink-muted">No leads yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-card border border-line bg-white">
            <table className="table-specs w-full min-w-[800px] text-sm">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Source</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Items</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</td>
                    <td>{l.source}</td>
                    <td>
                      {l.name}
                      {l.company ? <span className="block text-xs text-ink-muted">{l.company}</span> : null}
                    </td>
                    <td>
                      {l.phone && <span className="block">{l.phone}</span>}
                      {l.email && <span className="block">{l.email}</span>}
                      {l.preferredTime && <span className="block text-xs text-ink-muted">Call: {l.preferredTime}</span>}
                    </td>
                    <td>
                      {(l.items ?? []).map((i) => (
                        <span key={i.sku} className="block">
                          {i.qty} × {i.sku} <span className="text-ink-muted">{i.name}</span>
                        </span>
                      ))}
                    </td>
                    <td className="max-w-xs">
                      {l.timeline && <span className="block text-xs">Needs by: {l.timeline}</span>}
                      {l.notes && <span className="block">{l.notes}</span>}
                      {l.transcript && l.transcript.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-steel">Transcript ({l.transcript.length})</summary>
                          <ul className="mt-1 space-y-1 text-xs">
                            {l.transcript.map((t, i) => (
                              <li key={i}>
                                <strong>{t.role}:</strong> {t.text}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl">Top questions (anonymized)</h2>
        <p className="text-sm text-ink-muted">First message of each conversation, with emails and phone numbers stripped. {questions.length} conversations.</p>
        {top.length === 0 ? (
          <p className="mt-2 text-ink-muted">No questions yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {top.map((q) => (
              <li key={q.question} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="chip">{q.count}×</span>
                <span className="flex-1">{q.question}</span>
                <span className="text-xs text-ink-muted">{new Date(q.last).toLocaleDateString()}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
