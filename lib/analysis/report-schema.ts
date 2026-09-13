// AI 分析コメントの「形」を決める。
//
// OpenAI には Structured Outputs（出力の形をスキーマで強制する仕組み）でこの形を渡すので、
// ここが実質的な仕様書になる。項目を増減したら Snapshot テストを回し直すこと。

import { z } from "zod";

export const PRIORITIES = ["high", "medium", "low"] as const;

export const ReportSchema = z.object({
  /** 今月の総括。コンサルトーンで 200 字程度（上限は少し余裕を持たせる） */
  summary: z.string().min(1).max(300),
  /** 注目ポイント */
  highlights: z.array(z.string().min(1)).min(1).max(5),
  /** 懸念点。無い月もあるので 0 件を許す */
  concerns: z.array(z.string().min(1)).max(3),
  /** 翌月のアクション提案 */
  actions: z
    .array(
      z.object({
        priority: z.enum(PRIORITIES),
        action: z.string().min(1),
      }),
    )
    .min(1)
    .max(5),
});

export type Report = z.infer<typeof ReportSchema>;
export type ActionPriority = (typeof PRIORITIES)[number];
