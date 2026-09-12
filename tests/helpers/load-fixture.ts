import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * tests/fixtures/sample-sales.csv を、スプレッドシートから読んだときと同じ形
 * （1 行目がヘッダーの二次元配列）にして返す。
 */
export function loadSampleSheetValues(): string[][] {
  const path = resolve(process.cwd(), "tests/fixtures/sample-sales.csv");
  return readFileSync(path, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
}
