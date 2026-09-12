// 取り込み画面の状態。
// Server Action のファイル（"use server" 付き）は async 関数しか公開できないため、
// 型と初期値はここに置いている。

export type ImportState = {
  status: "idle" | "success" | "error";
  message: string;
  /** 「5 行目の quantity「abc」は整数ではありません」の一覧 */
  errors: string[];
};

export const INITIAL_IMPORT_STATE: ImportState = { status: "idle", message: "", errors: [] };

/** 画面に出すエラーの上限。多すぎると読む気をなくすため */
export const MAX_SHOWN_ERRORS = 20;
