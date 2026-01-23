import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  Target,
  XCircle,
  CheckCircle,
  UserPlus,
  Edit3,
  FileOutput,
  ClipboardList,
  TrendingUp,
  Timer,
  Shield,
  Globe,
  Smartphone,
  Zap,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ===================
// Hero Section
// ===================
export interface HeroContent {
  catchphrase: string;
  subcopy: string;
  primaryCta: string;
  secondaryCta: string;
  primaryCtaIcon: LucideIcon;
}

export const hero: HeroContent = {
  catchphrase: "週報作成、まだ手作業ですか？",
  subcopy: "工数を記録するだけで、週報が自動で完成。",
  primaryCta: "無料で始める",
  secondaryCta: "機能を見る",
  primaryCtaIcon: ArrowRight,
};

// ===================
// Pain Section (課題提起)
// ===================
export interface PainItem {
  text: string;
  icon: LucideIcon;
}

export const pains: PainItem[] = [
  { text: "週報作成に毎週30分以上かけている", icon: XCircle },
  { text: "何にどれくらい時間を使ったか思い出せない", icon: XCircle },
  { text: "目標を立てても進捗が見えない", icon: XCircle },
  { text: "工数データがバラバラで集計が大変", icon: XCircle },
];

export const painSectionTitle = "こんな悩み、ありませんか？";

// ===================
// Solution Section (解決策)
// ===================
export interface SolutionItem {
  before: string;
  after: string;
  icon: LucideIcon;
}

export const solutions: SolutionItem[] = [
  {
    before: "日々の工数を簡単に記録",
    after: "データが自動で蓄積",
    icon: CheckCircle,
  },
  {
    before: "ワンクリックで週報を生成",
    after: "30分の作業が30秒に",
    icon: CheckCircle,
  },
  {
    before: "目標と進捗を可視化",
    after: "達成度が一目でわかる",
    icon: CheckCircle,
  },
];

export const solutionSectionTitle = "Work Support が解決します";

// ===================
// Features Section (機能紹介)
// ===================
export interface Feature {
  icon: LucideIcon;
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

export const featuresSectionTitle = "主な機能";
export const featuresSectionSubtitle = "シンプルで強力なツールセット";

// ===================
// How It Works Section (使い方ステップ)
// ===================
export interface Step {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const steps: Step[] = [
  {
    number: 1,
    title: "アカウント作成",
    description: "30秒で登録完了",
    icon: UserPlus,
  },
  {
    number: 2,
    title: "日々の工数を記録",
    description: "タスクごとに時間を入力を簡単に追加",
    icon: Edit3,
  },
  {
    number: 3,
    title: "目標の進捗を追跡",
    description: "達成率をリアルタイムで確認",
    icon: TrendingUp,
  },
  {
    number: 4,
    title: "週報を自動生成",
    description: "ワンクリックでレポート完成",
    icon: FileOutput,
  },
];

export const howItWorksSectionTitle = "かんたん4ステップ";

// ===================
// Use Case Section (ユースケース)
// ===================
export interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const useCases: UseCase[] = [
  {
    icon: ClipboardList,
    title: "週報作成の自動化",
    description: "毎週の報告書作成を自動化。記録するだけで週報が完成します。",
  },
  {
    icon: TrendingUp,
    title: "目標達成率の可視化",
    description: "四半期や月次の目標をトラッキング。進捗が一目でわかります。",
  },
  {
    icon: Timer,
    title: "プロジェクト別の時間分析",
    description:
      "どの案件にどれだけ時間をかけているか把握。業務改善のヒントに。",
  },
];

export const useCaseSectionTitle = "こんな場面で活躍";

// ===================
// Differentiators Section (特徴/差別化)
// ===================
export interface Differentiator {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const differentiators: Differentiator[] = [
  {
    icon: Shield,
    title: "セキュアな認証",
    description: "メール/パスワード、Google連携に対応",
  },
  {
    icon: Globe,
    title: "ブラウザで完結",
    description: "インストール不要。どこからでもアクセス",
  },
  {
    icon: Smartphone,
    title: "マルチデバイス対応",
    description: "PC・タブレット・スマホで利用可能",
  },
  {
    icon: Zap,
    title: "完全日本語対応",
    description: "日本のビジネスシーンに最適化",
  },
];

export const differentiatorsSectionTitle = "Work Support の特徴";

// ===================
// FAQ Section
// ===================
export interface FAQItem {
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    question: "無料で使えますか？",
    answer:
      "はい、現在は無料でご利用いただけます。将来的にプレミアム機能を追加する可能性がありますが、基本機能は引き続き無料でお使いいただけます。",
  },
  {
    question: "データはどこに保存されますか？",
    answer:
      "データはセキュアなクラウドサーバーに保存されます。暗号化通信を使用し、お客様のデータを安全に管理しています。",
  },
  {
    question: "スマートフォンでも使えますか？",
    answer:
      "はい、レスポンシブデザインを採用しているため、PC・タブレット・スマートフォンなど、どのデバイスからでも快適にご利用いただけます。",
  },
  {
    question: "チームで共有できますか？",
    answer:
      "現在は個人利用を想定した機能を提供しています。チーム共有機能は今後のアップデートで追加予定です。",
  },
];

export const faqSectionTitle = "よくある質問";
export const faqIcon = ChevronDown;

// ===================
// Final CTA Section
// ===================
export const finalCTA = {
  title: "今すぐ始めましょう",
  subtitle: "工数管理をもっとシンプルに、週報作成をもっと楽に。",
  primaryCta: "無料で始める",
  primaryCtaIcon: ArrowRight,
};

// ===================
// Benefits (for backward compatibility)
// ===================
export const benefits: string[] = [
  "直感的なインターフェース",
  "リアルタイムの進捗追跡",
  "自動化されたレポート生成",
  "セキュアなデータ管理",
];

export const benefitIcon = Check;
