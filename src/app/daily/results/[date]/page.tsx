import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getDailyChallengeByDate } from "@/lib/db/daily";
import { dailyDateKey, isDateKey } from "@/lib/daily/day";
import { formatDayLong } from "@/lib/daily/format";
import { loadChallengeResults } from "@/lib/daily/results";
import { ResultsPodium } from "@/features/daily/results-podium";

export const metadata: Metadata = { title: "Results · Sorza Daily" };

export default async function DailyDayResultsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isDateKey(date) || date >= dailyDateKey()) notFound();

  const supabase = await createClient();
  const challenge = await getDailyChallengeByDate(supabase, date).catch(() => null);
  if (!challenge) notFound();
  const results = await loadChallengeResults(supabase, challenge);

  return (
    <PageShell width="2xl">
      <PageHeader
        eyebrow={formatDayLong(date)}
        title={challenge.title}
        description={challenge.description}
        back={{ href: "/daily/results", label: "Past results" }}
      />
      <ResultsPodium podium={results.podium} entryCount={results.entryCount} voteTotal={results.voteTotal} />
    </PageShell>
  );
}
