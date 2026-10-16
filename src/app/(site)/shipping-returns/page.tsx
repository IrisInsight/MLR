import type { Metadata } from "next";
import { company } from "@/lib/catalog";
import { ContactAside, TextBlocks, TopicPage } from "@/components/site/TopicPage";

export const metadata: Metadata = { title: "Shipping & returns" };

export default function ShippingPage() {
  return (
    <TopicPage eyebrow="Policies" title="Shipping & returns" intro="Free local delivery on orders over $600, will-call pickup in Fullerton, and freight when a third-party carrier is needed." aside={<ContactAside />}>
      <TextBlocks text={company.shippingReturns.replace(/^Shipping and Returns Policy\n/, "")} />
    </TopicPage>
  );
}
