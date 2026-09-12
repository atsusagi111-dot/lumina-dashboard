"use server";

import { revalidatePath } from "next/cache";
import { extractSpreadsheetId } from "@/lib/sheets/spreadsheet-id";
import { fetchSheetValues } from "@/lib/sheets/fetch-sheet";
import { validateSheetValues } from "@/lib/sheets/validate-rows";
import { requireUser } from "@/lib/supabase/require-user";
import { MAX_SHOWN_ERRORS, type ImportState } from "@/lib/sheets/import-state";

export async function importSpreadsheet(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  // proxy でも未ログインは弾いているが、データを触う場所でもう一度確かめる
  const { supabase, userId } = await requireUser();

  const input = formData.get("spreadsheetUrl");
  const id = extractSpreadsheetId(typeof input === "string" ? input : "");
  if (!id.ok) {
    return { status: "error", message: id.error, errors: [] };
  }

  const sheet = await fetchSheetValues(id.spreadsheetId);
  if (!sheet.ok) {
    return { status: "error", message: sheet.error, errors: [] };
  }

  const validated = validateSheetValues(sheet.values);
  if (!validated.ok) {
    return {
      status: "error",
      message: `${validated.errors.length} 件の問題が見つかりました。スプレッドシートを直してから、もう一度お試しください。データは 1 件も保存していません。`,
      errors: validated.errors.slice(0, MAX_SHOWN_ERRORS),
    };
  }

  // ① 取り込み記録を 1 件作る
  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      user_id: userId,
      spreadsheet_id: id.spreadsheetId,
      sheet_name: sheet.sheetName,
      row_count: validated.rows.length,
    })
    .select("id")
    .single();

  if (uploadError || !upload) {
    return { status: "error", message: "取り込み記録の保存に失敗しました。時間をおいてお試しください。", errors: [] };
  }

  // ② 明細をまとめて保存する
  const { error: rowsError } = await supabase
    .from("sales_data")
    .insert(validated.rows.map((row) => ({ ...row, upload_id: upload.id })));

  if (rowsError) {
    // 失敗したら取り込み記録も消して、中途半端なデータを残さない
    await supabase.from("uploads").delete().eq("id", upload.id);
    return { status: "error", message: "売上データの保存に失敗しました。時間をおいてお試しください。", errors: [] };
  }

  revalidatePath("/import");
  revalidatePath("/");

  const skipped =
    validated.skippedEmptyRows > 0 ? `（空行 ${validated.skippedEmptyRows} 行は飛ばしました）` : "";
  return {
    status: "success",
    message: `「${sheet.title}」から ${validated.rows.length} 件を取り込みました${skipped}。`,
    errors: [],
  };
}
