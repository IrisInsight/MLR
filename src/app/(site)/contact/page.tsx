import type { Metadata } from "next";
import { company } from "@/lib/catalog";
import { TopicPage } from "@/components/site/TopicPage";
import { CallbackForm } from "@/components/chat/CallbackForm";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { COUNTIES } from "@/lib/site";

export const metadata: Metadata = { title: "Contact MLR Packaging" };

export default function ContactPage() {
  return (
    <>
      <TopicPage
        eyebrow="Contact"
        title="Call, email, or stop by the counter."
        intro="Corporate office and warehouse in Fullerton. We answer the phone — and after hours, Ask MLR or the form below gets you a call back first thing."
        aside={
          <div className="card p-5">
            <CallbackForm compact source="contact" title="Send us a message" />
          </div>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <dt className="eyebrow">Phone</dt>
            <dd>
              <a href={company.phoneHref} className="font-display text-3xl font-bold text-red">
                {company.phone}
              </a>
              <p className="text-sm text-ink-muted">Fax {company.fax}</p>
            </dd>
          </div>
          <div className="card p-4">
            <dt className="eyebrow">Email</dt>
            <dd>
              <a href={`mailto:${company.email}`} className="text-lg text-steel underline underline-offset-2">
                {company.email}
              </a>
            </dd>
          </div>
          <div className="card p-4">
            <dt className="eyebrow">Corporate office &amp; warehouse</dt>
            <dd className="mt-1">
              {company.address.street}
              <br />
              {company.address.city}, {company.address.state} {company.address.zip}
              <br />
              <a href="https://maps.google.com/?q=1388+E+Valencia+Dr+Fullerton+CA+92831" target="_blank" rel="noopener noreferrer" className="text-sm text-steel underline underline-offset-2">
                Directions ↗
              </a>
            </dd>
          </div>
          <div className="card p-4">
            <dt className="eyebrow">Hours</dt>
            <dd className="mt-1">
              {company.hours.summary}
              <p className="mt-1 text-xs text-ink-muted">{company.hours.note}</p>
            </dd>
          </div>
        </dl>
        <h2>Delivery area</h2>
        <p>Our own trucks cover {COUNTIES.join(", ")} counties. Free local delivery within many local zip codes on orders over $600; $300 minimum on will-call.</p>
      </TopicPage>
      <DeliveryBanner />
    </>
  );
}
