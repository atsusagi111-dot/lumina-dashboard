import {
  formatAxisYen,
  formatCount,
  formatDateTime,
  formatMom,
  formatMonthLabel,
  formatPercent,
  formatShortMonthLabel,
  formatYen,
  momColorClass,
} from "@/lib/dashboard/format";

describe("金額の表示", () => {
  it("3 桁ごとの区切りと円記号を付ける", () => {
    expect(formatYen(264700)).toBe("￥264,700");
  });

  it("小数は四捨五入して 1 円単位で出す", () => {
    expect(formatYen(1234.56)).toBe("￥1,235");
  });

  it("-0 を「-￥0」と出さない", () => {
    expect(formatYen(-0)).toBe("￥0");
  });

  it("計算できないときは — を出す", () => {
    expect(formatYen(null)).toBe("—");
  });
});

describe("割合の表示", () => {
  it("小数第 1 位まで出す", () => {
    expect(formatPercent(46.7)).toBe("46.7%");
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("計算できないときは — を出す（0% と区別する）", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("ごくわずかなマイナスを「-0.0%」と出さない", () => {
    expect(formatPercent(-0.04)).toBe("0.0%");
  });
});

describe("前月比の表示", () => {
  it("増加はプラス記号を付けて緑にする", () => {
    const mom = formatMom(79.5);
    expect(mom).toEqual({ text: "+79.5%", direction: "up" });
    expect(momColorClass(mom.direction)).toBe("text-up");
  });

  it("減少はマイナス記号を付けて赤にする", () => {
    const mom = formatMom(-0.6);
    expect(mom).toEqual({ text: "-0.6%", direction: "down" });
    expect(momColorClass(mom.direction)).toBe("text-down");
  });

  it("増減なしは ±0.0% と出し、色は付けない", () => {
    const mom = formatMom(0);
    expect(mom).toEqual({ text: "±0.0%", direction: "flat" });
    expect(momColorClass(mom.direction)).toBe("text-ink-muted");
  });

  it("前月のデータが無いときは — を出す", () => {
    const mom = formatMom(null);
    expect(mom).toEqual({ text: "—", direction: "none" });
    expect(momColorClass(mom.direction)).toBe("text-ink-muted");
  });
});

describe("月と件数の表示", () => {
  it("2025-11 を 2025年11月 と出す（先頭の 0 は付けない）", () => {
    expect(formatMonthLabel("2025-11")).toBe("2025年11月");
    expect(formatMonthLabel("2025-09")).toBe("2025年9月");
    expect(formatShortMonthLabel("2025-09")).toBe("9月");
  });

  it("想定外の形はそのまま返す（画面を落とさない）", () => {
    expect(formatMonthLabel("いつ")).toBe("いつ");
  });

  it("件数は 3 桁ごとに区切る", () => {
    expect(formatCount(1234)).toBe("1,234");
  });
});

describe("グラフの軸ラベル", () => {
  it("金額が大きいときは万円単位にする", () => {
    expect(formatAxisYen(120000, 264700)).toBe("12万");
    expect(formatAxisYen(0, 264700)).toBe("0");
  });

  it("全体が 1 万円未満のときは円のまま出す（「0万」ばかりにしない）", () => {
    expect(formatAxisYen(3000, 8000)).toBe("3,000");
  });
});

describe("取り込み日時の表示", () => {
  it("日本時間で出す", () => {
    expect(formatDateTime("2025-12-01T00:00:00Z")).toContain("2025");
  });

  it("読めない値はそのまま返す（画面を落とさない）", () => {
    expect(formatDateTime("いつ")).toBe("いつ");
  });
});
