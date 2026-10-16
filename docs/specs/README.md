# 機能の仕様書

機能ごとに 1 フォルダ。`spec.md` が**機能の現在の姿**、`changes/` が**バージョンごとの改修の記録**（承認の対象であり、履歴でもある）。

```
docs/specs/
├── README.md            # この索引
├── incidents.md         # 症状から原因へたどる索引（バグ調査の入口）
├── _template/           # spec.md と change.md のテンプレート
└── <feature>/
    ├── spec.md
    └── changes/
        └── v<X.Y.Z>-<slug>.md
```

## 運用

- 改修は `autonomous-impl` スキルの流れで行う。改修の記録を `status: draft` で作り、人間が承認したら実装する
- 複数の機能にまたがる改修は、主な機能の `changes/` に置き、ほかの機能の `spec.md` の変更履歴からリンクする
- バグを直したら、`spec.md` のポストモーテム、`incidents.md`、再発防止テストの 3 つをそろえる

## 機能の一覧

> ハーネス移行計画の P5 で、旧要件定義書・旧詳細設計書（`docs/legacy/specs/`）とコードから順に作る。

| feature | 内容 | spec |
| --- | --- | --- |
| auth | ログイン、新規登録、パスワード再設定、ログアウト、AuthGuard | [spec.md](auth/spec.md) |
| landing | ランディングページ（未ログイン時のルーティングは auth） | [spec.md](landing/spec.md) |
| app-shell | ヘッダー、モバイルの下部ナビ、ホーム、ページの器（PWA は未導入） | [spec.md](app-shell/spec.md) |
| effort-entry | 工数登録（入れ子の入力、案件とタスクの候補、undo / redo、完了メール） | [spec.md](effort-entry/spec.md) |
| effort-draft | 工数登録の下書きの同期と競合の制御 | [spec.md](effort-draft/spec.md) |
| effort-ingest-gas | GAS / Google Form からのテキスト取り込み | [spec.md](effort-ingest-gas/spec.md) |
| effort-list | 工数一覧（絞り込み、並べ替え、ページ送り、集計） | [spec.md](effort-list/spec.md) |
| goals | 目標管理（現在の目標、重みの合計 100%、前週の進捗、目標の追加、過去の目標） | [spec.md](goals/spec.md) |
| missions | ミッション（週報の画面で編集する自由記述） | [spec.md](missions/spec.md) |
| weekly-report | 週報の出力（工数と目標の進捗から雛形を作る） | [spec.md](weekly-report/spec.md) |
| profile | プロフィール、アバター、アカウント削除 | [spec.md](profile/spec.md) |
| user-settings | ユーザー設定（メール通知、テーマ） | [spec.md](user-settings/spec.md) |
| mcp | MCP サーバー（AI のアプリから読み書きするツール、OAuth の同意の画面） | [spec.md](mcp/spec.md) |
| platform | ログ、エラー処理、認証ミドルウェア、CORS、OpenAPI、メール送信 | [spec.md](platform/spec.md) |
