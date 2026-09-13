import type { Metadata } from "next";
import Link from "next/link";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart";
import { SkuTable } from "@/components/dashboard/sku-table";
import { formatDateTime, formatMonthLabel, formatPercent, formatYen } from "@/lib/dashboard/format";
import { loadSalesRows } from "@/lib/dashboard/load-sales-rows";
import { selectMonth } from "@/lib/dashboard/select-month";
import { calcCategoryBreakdown, calcOverallRepeatRate, calcTopSkus } from "@/lib/kpi/breakdown";
import { calcMonthlyKpis, previousMonthKey } from "@/lib/kpi/monthly";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata: Metadata = {
  title: "ダッシュボード | LUMINA 売上分析ダッシュボード",
};

/**
 * ダッシュボード（トップページ）。
 *
 * この画面の役目は「データを取ってきて lib/ に渡し、返ってきた値を並べる」ことだけ。
 * KPI の計算式は lib/kpi/ に、表示の整形は lib/dashboard/format.ts にある（CLAUDE.md §3）。
 */
export default async function HomePage(props: PageProps<"/">) {
  const { supabase } = await requireUser();

  const loaded = await loadSalesRows(supabase);
  // 読み込み失敗を「0 件」と区別する。取り込み済みなのに未取り込みに見えると、二重取り込みの原因になる
  if (!loaded.ok) return <LoadErrorState />;

  const monthlyKpis = calcMonthlyKpis(loaded.rows);
  const months = monthlyKpis.map((kpi) => kpi.month);
  const { month } = await props.searchParams;
  const selectedMonth = selectMonth(months, month);

  if (!selectedMonth) return <EmptyState />;

  const current = monthlyKpis.find((kpi) => kpi.month === selectedMonth);
  // selectMonth は monthlyKpis にある月しか返さないので、ここには来ない。型の上での念のため
  if (!current) return <EmptyState />;

  const previous = monthlyKpis.find((kpi) => kpi.month === previousMonthKey(selectedMonth));
  const categories = calcCategoryBreakdown(loaded.rows, { month: selectedMonth });
  const topSkus = calcTopSkus(loaded.rows, { month: selectedMonth, limit: 10 });
  const overall = calcOverallRepeatRate(loaded.rows);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy-light">月次レポート</p>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">{formatMonthLabel(selectedMonth)}</h1>
          {loaded.uploadedAt && (
            <p className="mt-1 text-xs text-ink-muted">
              最終取り込み {formatDateTime(loaded.uploadedAt)}
            </p>
          )}
        </div>
        <MonthSwitcher months={months} selected={selectedMonth} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="売上"
          value={formatYen(current.revenue)}
          momRate={current.revenueMoM}
          caption={`前月 ${formatYen(previous?.revenue ?? null)}`}
        />
        <KpiCard
          label="粗利"
          value={formatYen(current.grossProfit)}
          momRate={current.grossProfitMoM}
          caption={`粗利率 ${formatPercent(current.grossMarginRate)}`}
        />
        <KpiCard
          label="リピート率"
          value={formatPercent(current.repeatRate)}
          caption={`購入者 ${current.buyerCount} 人中 ${current.repeatBuyerCount} 人（前月 ${formatPercent(
            previous?.repeatRate ?? null,
          )}）`}
        />
      </section>

      <section className="rounded-lg border border-navy-pale bg-surface p-5">
        <h2 className="text-base font-bold text-navy">月次推移</h2>
        <p className="mt-1 text-xs text-ink-muted">棒＝売上・粗利（左軸）、折れ線＝リピート率（右軸）</p>
        <MonthlyTrendChart
          points={monthlyKpis.map((kpi) => ({
            month: kpi.month,
            revenue: kpi.revenue,
            grossProfit: kpi.grossProfit,
            repeatRate: kpi.repeatRate,
          }))}
        />
        <p className="mt-2 text-xs text-ink-muted">
          全期間のリピート率（2 ヶ月以上購入した顧客の割合）：{formatPercent(overall.rate)}
          （{overall.totalCustomers} 人中 {overall.repeatCustomers} 人）
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-navy-pale bg-surface p-5">
          <h2 className="text-base font-bold text-navy">カテゴリ別売上</h2>
          {/* 表示中の月には必ず売上行があるので、通常ここは通らない。型の上での保険 */}
          {categories.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">この月の売上はありません。</p>
          ) : (
            <CategoryChart items={categories} />
          )}
        </section>

        <section className="rounded-lg border border-navy-pale bg-surface p-5">
          <h2 className="text-base font-bold text-navy">SKU トップ 10</h2>
          <SkuTable items={topSkus} />
        </section>
      </div>
    </div>
  );
}

/** まだ 1 件も取り込んでいない人に出す案内 */
function EmptyState() {
  return (
    <section className="card">
      <p className="text-sm font-medium text-navy-light">はじめに</p>
      <h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">売上データを取り込みましょう</h1>
      <p className="mt-4 leading-relaxed text-ink-muted">
        Google スプレッドシートに貼り付けた売上データを読み込むと、KPI カードとグラフが表示されます。
      </p>
      <Link
        href="/import"
        className="mt-6 inline-block rounded-md bg-navy px-4 py-2 font-medium text-white transition hover:bg-navy-light"
      >
        データを取り込む
      </Link>
    </section>
  );
}

/** 売上データを読めなかったときの表示（「まだ 0 件」とは別のことだと分かるようにする） */
function LoadErrorState() {
  return (
    <section className="card">
      <h1 className="text-2xl font-bold text-navy">売上データを読み込めませんでした</h1>
      <p className="mt-4 leading-relaxed text-ink-muted">
        時間をおいて画面を再読み込みしてください。続くようなら管理者にご連絡ください。
      </p>
    </section>
  );
}
