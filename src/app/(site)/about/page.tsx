import type { Metadata } from "next";
import { company } from "@/lib/catalog";
import { ContactAside, TextBlocks, TopicPage } from "@/components/site/TopicPage";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { COUNTIES } from "@/lib/site";

export const metadata: Metadata = { title: "About MLR Packaging" };

export default function AboutPage() {
  return (
    <>
      <TopicPage eyebrow="About MLR" title="Family-owned. Fullerton-based. Since 2001." intro={company.mission} aside={<ContactAside />}>
        <TextBlocks text={company.about.replace(/^Our Mission\n[^\n]+\n/, "").replace(/^About\n/, "")} />
        <h2>What that means for you</h2>
        <ul>
          <li>Two warehouses and our own fleet of 8+ trucks — free local delivery on orders over $600 across {COUNTIES.join(", ")} counties.</li>
          <li>Ultra-competitive quoted pricing from long-standing manufacturer and vendor relationships.</li>
          <li>A sales rep who knows your account, plus Ask MLR online 24/7 for the quick questions.</li>
          <li>Will-call pickup in Fullerton ($300 minimum) and rush deliveries on request.</li>
        </ul>
        {company.inspiration && (
          <blockquote className="mt-6 border-l-4 border-red pl-4 italic text-ink-muted">{company.inspiration}</blockquote>
        )}
      </TopicPage>
      <DeliveryBanner />
    </>
  );
}
