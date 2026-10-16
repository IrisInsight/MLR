import { COUNTIES, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function DeliveryBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-green-soft px-3 py-2 text-sm text-green">
        <TruckIcon className="h-5 w-5 shrink-0" />
        <span>
          <strong>Free local delivery</strong> on orders over $600 — our own trucks, {COUNTIES.length} SoCal counties.
        </span>
      </p>
    );
  }
  return (
    <section className="bg-green text-white">
      <div className="container-x flex flex-col items-start gap-3 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <TruckIcon className="h-10 w-10 shrink-0" />
          <div>
            <p className="display text-2xl leading-none">Free local deliveries</p>
            <p className="mt-1 text-sm text-white/90">
              On orders over $600 within our local zip codes. Our own drivers cover {COUNTIES.join(", ")} counties. $300 minimum on will-call pickup.
            </p>
          </div>
        </div>
        <a href={PHONE_HREF} className="btn bg-white text-green hover:bg-paper">
          Call {PHONE_DISPLAY}
        </a>
      </div>
    </section>
  );
}

export function TruckIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
