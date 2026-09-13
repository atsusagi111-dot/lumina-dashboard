import { extractSpreadsheetId } from "@/lib/sheets/spreadsheet-id";

// テスト用の架空の ID（Google の ID と同じ形：44 文字の英数字・ハイフン・アンダースコア）。
// 実在するシートの ID は書かない。このリポジトリは公開されているため
const SHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCd";

describe("スプレッドシート ID の取り出し", () => {
  it("編集画面の URL から取り出せる", () => {
    const result = extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`);
    expect(result).toEqual({ ok: true, spreadsheetId: SHEET_ID });
  });

  it("末尾のパラメータが無い URL でも取り出せる", () => {
    const result = extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
    expect(result).toEqual({ ok: true, spreadsheetId: SHEET_ID });
  });

  it("ID を直接入力しても受け付ける", () => {
    expect(extractSpreadsheetId(SHEET_ID)).toEqual({ ok: true, spreadsheetId: SHEET_ID });
  });

  it("前後の空白は無視する", () => {
    expect(extractSpreadsheetId(`  ${SHEET_ID}  `)).toEqual({ ok: true, spreadsheetId: SHEET_ID });
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
