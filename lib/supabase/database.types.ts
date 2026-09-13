// Supabase のテーブル定義に対応する型。
// supabase/migrations/0001_init.sql と同じ内容を手で書いている。
// テーブルを変えたら、このファイルも一緒に更新すること。
//
// これを Supabase クライアントに渡すと、select の列名の間違いや
// 取り出した値の型の取り違えを、型チェックの時点で見つけられる。

export type Database = {
  public: {
    Tables: {
      uploads: {
        Row: {
          id: string;
          user_id: string;
          spreadsheet_id: string;
          sheet_name: string;
          row_count: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          spreadsheet_id: string;
          sheet_name: string;
          row_count: number;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["uploads"]["Insert"]>;
        Relationships: [];
      };
      sales_data: {
        Row: {
          id: string;
          upload_id: string;
          order_date: string;
          customer_id: string | null;
          product_name: string;
          category: string | null;
          sku: string | null;
          quantity: number;
          revenue: number;
          cost: number;
        };
        Insert: {
          id?: string;
          upload_id: string;
          order_date: string;
          customer_id?: string | null;
          product_name: string;
          category?: string | null;
          sku?: string | null;
          quantity: number;
          revenue: number;
          cost: number;
        };
        Update: Partial<Database["public"]["Tables"]["sales_data"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          /** 分析の持ち主。RLS はこの列で判定する */
          user_id: string;
          /** どの取り込みのデータで作ったかの記録。取り込みが消えると null になる */
          upload_id: string | null;
          /** 対象の月（"2025-11" の形） */
          target_month: string;
          summary: string;
          highlights: unknown;
          concerns: unknown;
          actions: unknown;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          upload_id?: string | null;
          target_month: string;
          summary: string;
          highlights?: unknown;
          concerns?: unknown;
          actions?: unknown;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
