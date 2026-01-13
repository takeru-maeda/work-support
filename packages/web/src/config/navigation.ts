import { Home, Clock, List, Target, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";

/**
 * ナビゲーション項目の型定義
 */
export interface NavigationItem {
  route: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

/**
 * メインナビゲーション項目の定義
 *
 * アプリケーション全体で使用されるナビゲーション項目を一元管理します。
 * - ヘッダーナビゲーション
 * - モバイル下部ナビゲーション
 * - ホームページの機能カード
 */
export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    route: ROUTES.home,
    label: "ホーム",
    icon: Home,
    description: "ホーム画面",
  },
  {
    route: ROUTES.effortsNew,
    label: "工数登録",
    icon: Clock,
    description: "日々の作業内容と時間を記録",
  },
  {
    route: ROUTES.efforts,
    label: "工数一覧",
    icon: List,
    description: "登録された工数データの確認",
  },
  {
    route: ROUTES.goals,
    label: "目標管理",
    icon: Target,
    description: "目標設定と進捗管理",
  },
  {
    route: ROUTES.weeklyReport,
    label: "週報出力",
    icon: FileText,
    description: "週次レポートの作成",
  },
];
