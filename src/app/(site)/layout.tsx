import type { ReactNode } from "react";
import { ConceptBanner } from "@/components/site/ConceptBanner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileCallBar } from "@/components/site/MobileCallBar";
import { ChatWidget } from "@/components/chat/ChatWidget";

/** Site chrome: concept banner, header, footer, mobile call bar and the floating Ask MLR widget. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ConceptBanner />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileCallBar />
      <ChatWidget />
    </>
  );
}
