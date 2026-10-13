# ドキュメントの索引

| 場所 | 内容 | いつ読む / 書く |
| --- | --- | --- |
| [steering/](steering/) | プロジェクト全体の規約と判断の軸（product / tech / structure ほか分野別） | 常に前提。更新は `steering` スキルで |
| [specs/](specs/README.md) | 機能ごとの仕様書（`<feature>/spec.md`）と改修の記録（`<feature>/changes/`） | 改修のたびに読み、更新する |
| [specs/incidents.md](specs/incidents.md) | 症状から原因へたどる索引 | バグ調査の最初に読む |
| [reference/database.md](reference/database.md) | テーブルの全体像（ER 図、列、ビュー）。大部分はコードから自動生成 | DB に触れる改修の前に読む |
| [reference/api.md](reference/api.md) | API のエンドポイントの一覧（認証、入力、応答）。大部分はルートの定義から自動生成 | API に触れる改修の前に読む |
| [plans/](plans/) | 大きなタスクの計画書（`active/` / `completed/`） | 複数の機能にまたがる作業、基盤の整備 |
| [harness/](harness/) | ハーネスの改善記録、外部スキルの管理 | ハーネスの不具合や穴を見つけたとき |
| [testing/manual-checklist.md](testing/manual-checklist.md) | 手動でしか確かめられない挙動 | リリース前、関係する機能を変えたとき |
| [guides/](guides/) | lint で強制できない書き方の規約（コーディング、JSDoc、バージョン） | コードを書くとき |
| [adr/](adr/) | 設計判断の記録（書き換えず、覆すときは新しい ADR を足す） | 重要な技術判断をしたとき |
| [legacy/](legacy/) | 旧要件定義書・旧詳細設計書・旧タスクリスト | 仕様書への変換（移行計画の P5）が終わったら削除する |

変更履歴は、リポジトリのルートの [CHANGELOG.md](../CHANGELOG.md) にある。
