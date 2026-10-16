import type { Metadata } from "next";
import Link from "next/link";
import { ContactAside, TopicPage } from "@/components/site/TopicPage";
import { CallbackForm } from "@/components/chat/CallbackForm";
import { AskMLRButton } from "@/components/chat/AskButtons";

export const metadata: Metadata = { title: "Special pricing & quotes" };

export default function SpecialPricingPage() {
  return (
    <TopicPage eyebrow="Special pricing" title="Website prices are full retail. Quoted pricing is usually much lower." intro="Call, email, or send us your list — our quotes are very competitive, and the customer service team is dedicated to getting it right." aside={<ContactAside />}>
      <ul>
        <li>
          <strong>Free local delivery</strong> within many local zip codes on orders over $600.
        </li>
        <li>
          <strong>$300 minimum</strong> for all will-call orders.
        </li>
        <li>Volume tiers, standing orders and multi-line quotes get our best pricing.</li>
        <li>We source far more than what&apos;s online — ask about anything you don&apos;t see.</li>
      </ul>
      <p>
        In a city filled with so many choices, we thank you for giving us the opportunity to provide you with a quote!
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/quote" className="btn-primary">
          Build a quote list
        </Link>
        <AskMLRButton label="Ask MLR for a recommendation" className="btn-outline" />
      </div>
      <div className="card mt-8 p-5">
        <CallbackForm source="callback" title="Request a quote call back" />
      </div>
    </TopicPage>
  );
}
