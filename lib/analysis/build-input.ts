// OpenAI に渡す「集計データ」を組み立てる純粋関数。
//
// ここで渡すものを絞るのが、この機能でいちばん大事な約束ごと。
// 売上明細（1 件ずつの注文）や customer_id は **絶対に含めない**。理由は 3 つ：
//   ① 個人につながりうる情報を外部サービスに出さないため
//   ② 渡す量が減るほど料金が安くなるため
//   ③ 集計済みの数字だけの方が、AI が事実を取り違えにくいため
// この決まりは CLAUDE.md §6 にも書いてある。

import type { MonthlyKpi } from "@/lib/kpi/monthly";
import type { CategorySales, SkuSales } from "@/lib/kpi/breakdown";

/** 直近何か月分を渡すか。多いほど料金が上がるので、前月比が語れる 3 か月にしている */
export const MONTHS_IN_INPUT = 3;

export type AnalysisInput = {
  targetMonth: string;
  monthly: Array<{ month: string; revenue: number; grossProfit: number; repeatRate: number | null }>;
  momChange: { revenue: number | null; grossProfit: number | null };
  byCategory: Array<{ category: string; revenue: number; share: number | null }>;
  topSkus: Array<{ sku: string; productName: string; revenue: number; quantity: number }>;
};

type Params = {
  targetMonth: string;
  /** calcMonthlyKpis の結果（古い順） */
  monthlyKpis: MonthlyKpi[];
  /** 対象月の calcCategoryBreakdown の結果 */
  categories: CategorySales[];
  /** 対象月の calcTopSkus の結果 */
  topSkus: SkuSales[];
};

/**
 * 集計結果から、OpenAI に渡す JSON を作る。
 * 形は .claude/skills/openai-analysis/SKILL.md の「user メッセージに渡す集計データの形」に合わせる。
 */
export function buildAnalysisInput({
  targetMonth,
  monthlyKpis,
  categories,
  topSkus,
}: Params): AnalysisInput {
  const targetIndex = monthlyKpis.findIndex((kpi) => kpi.month === targetMonth);
  if (targetIndex === -1) {
    throw new Error(`対象月 ${targetMonth} の集計がありません`);
  }

  // 対象月を含む直近 3 か月。対象月より後の月は、まだ起きていない話なので渡さない
  const recent = monthlyKpis.slice(Math.max(0, targetIndex + 1 - MONTHS_IN_INPUT), targetIndex + 1);
  const target = monthlyKpis[targetIndex];

  return {
    targetMonth,
    monthly: recent.map((kpi) => ({
      month: kpi.month,
      revenue: kpi.revenue,
      grossProfit: kpi.grossProfit,
      repeatRate: kpi.repeatRate,
    })),
    momChange: { revenue: target.revenueMoM, grossProfit: target.grossProfitMoM },
    byCategory: categories.map((item) => ({
      category: item.category,
      revenue: item.revenue,
      share: item.share,
    })),
    topSkus: topSkus.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      revenue: item.revenue,
      quantity: item.quantity,
    })),
  };
}
