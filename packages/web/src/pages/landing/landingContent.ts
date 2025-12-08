import { ArrowRight, Check, Clock, FileText, Target } from "lucide-react";

export interface Feature {
  icon: typeof Clock;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}

export const features: Feature[] = [
  {
    icon: Clock,
    title: "工数管理",
    description:
      "案件とタスクごとに作業時間を記録。見積と実績を比較して、時間管理を最適化。",
    gradient: "from-blue-500/10 via-cyan-500/10 to-blue-500/5",
    iconBg: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: Target,
    title: "目標設定",
    description:
      "重み付けされた目標を設定し、全体の達成率をリアルタイムで追跡。",
    gradient: "from-purple-500/10 via-pink-500/10 to-purple-500/5",
    iconBg: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: FileText,
    title: "週報自動生成",
    description:
      "記録されたデータから週報を自動作成。レポート作成の手間を削減。",
    gradient: "from-amber-500/10 via-orange-500/10 to-amber-500/5",
    iconBg: "from-amber-500/20 to-orange-500/20",
  },
];

export const benefits: string[] = [
  "直感的なインターフェース",
  "リアルタイムの進捗追跡",
  "自動化されたレポート生成",
  "セキュアなデータ管理",
];

export const hero = {
  titleLines: ["時間を可視化し、", "目標を達成する"],
  leadLines: [
    "Work Supportは、工数管理と目標追跡を統合したプラットフォーム。",
    "日々の進捗を記録し、成果を最大化します。",
  ],
  primaryCtaIcon: ArrowRight,
};

export const benefitIcon = Check;
