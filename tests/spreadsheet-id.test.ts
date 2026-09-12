import { extractSpreadsheetId } from "@/lib/sheets/spreadsheet-id";

const REAL_ID = "1xPSzNyoLsb0zy8HntLlNMD7YBmAKhDABY2PAFSHkLGU";

describe("スプレッドシート ID の取り出し", () => {
  it("編集画面の URL から取り出せる", () => {
    const result = extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${REAL_ID}/edit#gid=0`);
    expect(result).toEqual({ ok: true, spreadsheetId: REAL_ID });
  });

  it("末尾のパラメータが無い URL でも取り出せる", () => {
    const result = extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${REAL_ID}`);
    expect(result).toEqual({ ok: true, spreadsheetId: REAL_ID });
  });

  it("ID を直接入力しても受け付ける", () => {
    expect(extractSpreadsheetId(REAL_ID)).toEqual({ ok: true, spreadsheetId: REAL_ID });
  });

  it("前後の空白は無視する", () => {
    expect(extractSpreadsheetId(`  ${REAL_ID}  `)).toEqual({ ok: true, spreadsheetId: REAL_ID });
  });

  it("空のときは入力を促す", () => {
    const result = extractSpreadsheetId("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("入力してください");
  });

  it("別のサイトの URL は形式を案内して断る", () => {
    const result = extractSpreadsheetId("https://example.com/foo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("docs.google.com/spreadsheets");
  });

  it("短すぎる文字列は ID として扱わない", () => {
    expect(extractSpreadsheetId("abc123").ok).toBe(false);
  });
});
