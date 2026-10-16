import type { Metadata } from "next";
import { company } from "@/lib/catalog";
import { ContactAside, TextBlocks, TopicPage } from "@/components/site/TopicPage";

export const metadata: Metadata = { title: "Proposition 65" };

export default function Prop65Page() {
  return (
    <TopicPage eyebrow="Compliance" title="Proposition 65" aside={<ContactAside />}>
      <TextBlocks text={company.prop65} />
      <p>
        The complete Proposition 65 chemical list is published by the State of California at{" "}
        <a href="https://oehha.ca.gov/proposition-65/proposition-65-list" target="_blank" rel="noopener noreferrer">
          oehha.ca.gov
        </a>
        .
      </p>
    </TopicPage>
  );
}
