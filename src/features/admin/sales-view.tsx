import { formatSaleAmount, SALE_KIND_LABELS, saleTotals, type Sale, type SaleKind } from "@/lib/sales/sale";
import { relativeTime } from "@/lib/format/relative-time";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import {
  BoltIcon,
  DecalIcon,
  GalleryIcon,
  GemIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  StarIcon,
  TimerIcon,
} from "@/components/ui/icons";

export const SALES_DAYS = 90;

const KIND_STYLE: Record<SaleKind, { icon: typeof GemIcon; color: string }> = {
  points: { icon: StarIcon, color: "#ff9f0a" },
  tee: { icon: ShoppingBagIcon, color: "#ff4433" },
  poster: { icon: GalleryIcon, color: "#5e5ce6" },
  decal: { icon: DecalIcon, color: "#30d158" },
  ad: { icon: GemIcon, color: "#30b0c7" },
  meet: { icon: TimerIcon, color: "#ff9f0a" },
  shop_promotion: { icon: BoltIcon, color: "#bf5af2" },
};

/** Admin → Sales: what came in lately, then each sale, newest first.
 * Amounts are what the buyer paid, before Stripe's or Apple's cut. */
export function SalesView({ sales, usernames, now }: { sales: Sale[]; usernames: Record<string, string>; now: number }) {
  const totals = saleTotals(sales, now);

  const stats = [
    { label: "Last 24 hours", value: totals.day },
    { label: "Last 7 days", value: totals.week },
    { label: "Last 30 days", value: totals.month },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Sales</h1>
        <p className="mt-0.5 text-[0.875rem] text-muted">
          Everything bought with real money. You get a push for each one.
        </p>
      </div>

      <section className="mb-8">
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass-raised elev-1 rounded-[18px] px-3 py-3.5">
              <p className="numeral text-[1.25rem] leading-none tabular-nums">{formatSaleAmount(value)}</p>
              <p className="mt-1.5 text-[0.75rem] text-muted">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-[0.75rem] text-muted">Before Stripe and Apple fees. Refunds left out.</p>
      </section>

      <section>
        <SectionTitle action={sales.length > 0 ? `${sales.length} in ${SALES_DAYS} days` : undefined}>Recent sales</SectionTitle>
        {sales.length === 0 ? (
          <div className="glass-raised elev-1 flex items-center gap-3.5 rounded-[22px] p-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-muted">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold">No sales yet</p>
              <p className="text-[0.8125rem] text-muted">Purchases from the last {SALES_DAYS} days show up here.</p>
            </div>
          </div>
        ) : (
          <GroupedList>
            {sales.map((sale) => {
              const { icon: Icon, color } = KIND_STYLE[sale.kind];
              const username = usernames[sale.buyerId];
              return (
                <GroupedRow
                  key={sale.id}
                  href={username ? `/u/${username}` : undefined}
                  icon={
                    <RowIcon color={color}>
                      <Icon />
                    </RowIcon>
                  }
                  label={sale.title}
                  detail={
                    <>
                      <span>
                        {username ? `@${username}` : "Deleted account"} · {SALE_KIND_LABELS[sale.kind]}
                        {sale.detail ? ` · ${sale.detail}` : ""} ·{" "}
                        <span suppressHydrationWarning>{relativeTime(sale.createdAt)}</span>
                      </span>
                      {sale.problem && <span className="mt-0.5 block text-danger">{sale.problem}</span>}
                    </>
                  }
                  value={
                    <span className={`tabular-nums ${sale.refunded ? "line-through" : "font-semibold text-foreground"}`}>
                      {formatSaleAmount(sale.amountCents)}
                    </span>
                  }
                />
              );
            })}
          </GroupedList>
        )}
      </section>
    </div>
  );
}
