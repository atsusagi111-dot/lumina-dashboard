import { rateOf, roundMoney, roundRate, toMonthKey } from "@/lib/kpi/round";

// サンプルデータは全部が整数円なので、他のテストは丸め処理をほとんど踏まない。
// ここで丸めだけを正面から固定しておく。

describe("金額の丸め（小数第 2 位）", () => {
  it("見た目どおりに四捨五入する（2 進数の誤差に引きずられない）", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(8.165)).toBe(8.17);
    expect(roundMoney(2.675)).toBe(2.68);
  });

  it("金額の桁が大きくても正しく丸める", () => {
    expect(roundMoney(10000.005)).toBe(10000.01);
    expect(roundMoney(123456.789)).toBe(123456.79);
  });

  it("マイナスも日本式の四捨五入（絶対値で丸める）", () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(-0.5)).toBe(-0.5);
  });

  it("0 は -0 ではなく 0 を返す", () => {
    expect(Object.is(roundMoney(0), 0)).toBe(true);
    expect(Object.is(roundMoney(-1e-9), 0)).toBe(true);
  });

  it("小数の足し算のズレを吸収する", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("割合の丸め（小数第 1 位）", () => {
  it("見た目どおりに四捨五入する", () => {
    expect(roundRate(4.15)).toBe(4.2);
    expect(roundRate(4.1499999999999995)).toBe(4.2);
    expect(roundRate(62.938005390835576)).toBe(62.9);
  });
});

describe("割合の計算", () => {
  it("分母が 0 なら null（0% と区別する）", () => {
    expect(rateOf(1, 0)).toBeNull();
    expect(rateOf(0, 0)).toBeNull();
  });

  it("小数第 1 位まで返す", () => {
    expect(rateOf(5, 13)).toBe(38.5);
    expect(rateOf(8, 28)).toBe(28.6);
  });
});

describe("月キーの取り出し", () => {
  it("日付から年月だけを取り出す", () => {
    expect(toMonthKey("2025-11-03")).toBe("2025-11");
  });
});
