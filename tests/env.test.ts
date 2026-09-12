import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

describe("環境変数の読み込み", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("値があればそのまま返す", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    expect(supabaseUrl()).toBe("https://example.supabase.co");
    expect(supabasePublishableKey()).toBe("sb_publishable_test");
  });

  it("値が無いときは、何をどこに書けばよいか日本語で伝える", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => supabaseUrl()).toThrowError("NEXT_PUBLIC_SUPABASE_URL");
    expect(() => supabaseUrl()).toThrowError(".env.local");
  });
});
