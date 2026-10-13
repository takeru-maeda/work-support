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
| auth | ログイン、新規登録、パスワード再設定、ログアウト、AuthGuard | 未作成 |
| landing | ランディングページ、未ログイン時のルーティング | 未作成 |
| app-shell | ヘッダー、モバイルの下部ナビ、PWA | 未作成 |
| effort-entry | 工数登録（入れ子の入力、undo / redo、完了メール） | 未作成 |
| effort-draft | 工数登録の下書きの同期と競合の制御 | 未作成 |
| effort-ingest-gas | GAS / Google Form からのテキスト取り込み | 未作成 |
| effort-list | 工数一覧（絞り込み、並べ替え、ページ送り、集計） | 未作成 |
| goals-current | 現在の目標（重みの合計 100%、前週の進捗） | 未作成 |
| goals-add | 目標の追加 | 未作成 |
| goals-history | 過去の目標 | 未作成 |
| missions | ミッション | 未作成 |
| weekly-report | 週報 | 未作成 |
| profile | プロフィール、アバター、アカウント削除 | 未作成 |
| user-settings | ユーザー設定（メール通知、テーマ） | 未作成 |
| platform | ログ、エラー処理、認証ミドルウェア、CORS、OpenAPI、メール送信 | [作成中](platform/spec.md)（認証のみ。残りは P5） |
