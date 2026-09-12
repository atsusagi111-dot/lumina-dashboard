import { validateSheetValues, EXPECTED_HEADERS } from "@/lib/sheets/validate-rows";
import { loadSampleSheetValues } from "./helpers/load-fixture";

const HEADER = [...EXPECTED_HEADERS];
const VALID_ROW = ["2025-11-03", "C001", "ウールコート", "アウター", "LUM-OUT-01", "1", "24800", "9200"];

/** ヘッダー + 指定した行だけのシートを作る */
function sheetWith(...rows: string[][]): string[][] {
  return [HEADER, ...rows];
}

/** 1 セルだけ差し替えた行を作る */
function rowWith(column: (typeof EXPECTED_HEADERS)[number], value: string): string[] {
  const row = [...VALID_ROW];
  row[EXPECTED_HEADERS.indexOf(column)] = value;
  return row;
}

function errorsOf(values: string[][]): string[] {
  const result = validateSheetValues(values);
  if (result.ok) throw new Error("エラーになるはずが、検査を通ってしまいました");
  return result.errors;
}

describe("サンプルデータ", () => {
  it("40 件すべてが検査を通る", () => {
    const result = validateSheetValues(loadSampleSheetValues());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(40);
    expect(result.skippedEmptyRows).toBe(0);
  });

  it("金額と数量が数値として取り出される", () => {
    const result = validateSheetValues(loadSampleSheetValues());

    if (!result.ok) throw new Error("検査を通りませんでした");
    const total = result.rows.reduce((sum, row) => sum + row.revenue, 0);
    expect(total).toBe(560600); // docs/sample-data.md の合計売上
  });
});

describe("ヘッダーの検査", () => {
  it("列名が違えば、期待と実際を示す", () => {
    const header: string[] = [...HEADER];
    header[4] = "SKU番号";

    expect(errorsOf([header, VALID_ROW])[0]).toBe(
      "1 行目 5 列目の列名が違います：期待「sku」、実際「SKU番号」",
    );
  });

  it("列が足りなければ、その旨を示す", () => {
    expect(errorsOf([HEADER.slice(0, 7), VALID_ROW])[0]).toBe("1 行目 8 列目の列名がありません：期待「cost」");
  });

  it("シートが空なら案内する", () => {
    expect(errorsOf([])[0]).toContain("シートが空です");
  });
});

describe("日付の検査", () => {
  it("スラッシュ区切りや 1 桁の月日を統一する", () => {
    const result = validateSheetValues(sheetWith(rowWith("order_date", "2025/11/3")));

    if (!result.ok) throw new Error(result.errors.join(" / "));
    expect(result.rows[0].order_date).toBe("2025-11-03");
  });

  it("存在しない日付は弾く", () => {
    expect(errorsOf(sheetWith(rowWith("order_date", "2025-02-31")))[0]).toBe(
      "2 行目の order_date「2025-02-31」は日付として読めません（例：2025-11-03）",
    );
  });

  it("空欄は弾く", () => {
    expect(errorsOf(sheetWith(rowWith("order_date", "")))[0]).toBe("2 行目の order_date が空です");
  });
});

describe("数量と金額の検査", () => {
  it("整数でない数量は、行番号と値を添えて知らせる", () => {
    expect(errorsOf(sheetWith(rowWith("quantity", "abc")))[0]).toBe(
      "2 行目の quantity「abc」は整数ではありません",
    );
  });

  it("0 以下の数量は弾く", () => {
    expect(errorsOf(sheetWith(rowWith("quantity", "0")))[0]).toBe("2 行目の quantity「0」は 1 以上にしてください");
  });

  it("「¥」やカンマ付きの金額は数値として読む", () => {
    const result = validateSheetValues(sheetWith(rowWith("revenue", "¥19,800")));

    if (!result.ok) throw new Error(result.errors.join(" / "));
    expect(result.rows[0].revenue).toBe(19800);
  });

  it("マイナスの金額は弾く", () => {
    expect(errorsOf(sheetWith(rowWith("cost", "-100")))[0]).toBe("2 行目の cost「-100」はマイナスにできません");
  });
});

describe("その他の列", () => {
  it("customer_id・category・sku は空でも通り、null になる", () => {
    const row = [...VALID_ROW];
    row[1] = "";
    row[3] = "";
    row[4] = "";
    const result = validateSheetValues(sheetWith(row));

    if (!result.ok) throw new Error(result.errors.join(" / "));
    expect(result.rows[0].customer_id).toBeNull();
    expect(result.rows[0].category).toBeNull();
    expect(result.rows[0].sku).toBeNull();
  });

  it("product_name が空なら弾く", () => {
    expect(errorsOf(sheetWith(rowWith("product_name", "  ")))[0]).toBe("2 行目の product_name が空です");
  });
});

describe("行のまとめ方", () => {
  it("完全に空の行は飛ばす", () => {
    const result = validateSheetValues(sheetWith(VALID_ROW, ["", "", "", "", "", "", "", ""], VALID_ROW));

    if (!result.ok) throw new Error(result.errors.join(" / "));
    expect(result.rows).toHaveLength(2);
    expect(result.skippedEmptyRows).toBe(1);
  });

  it("1 件目で止めず、すべてのエラーをまとめて返す", () => {
    const errors = errorsOf(sheetWith(rowWith("quantity", "abc"), rowWith("cost", "-1")));

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("2 行目");
    expect(errors[1]).toContain("3 行目");
  });

  it("データ行が無ければ案内する", () => {
    expect(errorsOf(sheetWith())[0]).toContain("データ行がありません");
  });
});
