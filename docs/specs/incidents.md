# インシデント索引（症状 → 原因の文書）

バグは、見えている症状が原因を取り違えさせやすい（例: 下書きの同期の競合が「入力が消えた」に見える）。**バグを調べるときは、仮説を立てる前にまずここを引き**、症状に近い行から該当する仕様書の「設計不変条件」と「ポストモーテム」を読む。grep より先にここを読む。

## 使い方

1. 症状に近い行を下の表で探し、該当する仕様書の節を開く
2. その仕様書の **設計不変条件** と **ポストモーテム（再発時に確認すること）** を先に読む。再発の多くは、過去と同じ不変条件の違反
3. 機能の分野から探したいときは、各仕様書の frontmatter の `symptoms:` を grep する（`rg "symptoms" docs/specs`）
4. 直したら、下の「直したあとにやること」を行う

## 症状 → 原因

| 症状（利用者から見えること） | 機能 | 該当する文書 | まず読む節 / 再発時に確認すること |
| --- | --- | --- | --- |
| Google Form から送った工数が 1 行も登録されず、開発者に「工数のテキストに読めない行があります」のメールが届く（v1.1.2 から。それまでは書き間違えた行だけが黙って登録されなかった） | effort-ingest-gas | [effort-ingest-gas/spec.md](effort-ingest-gas/spec.md) | AC-06、AC-07（メッセージの行番号と理由）、INV-4（フォームの説明文と書式が合っているか）、INV-5 |
| 工数を登録したのに、次に工数登録画面を開くと、登録した内容が下書きとして戻ってくる | effort-draft | [effort-draft/spec.md](effort-draft/spec.md) | ポストモーテム 2026-01-23（`a8a5c14`）、INV-2。送信の最初に待っている保存を取り消しているか |
| 別の端末で入力した内容が反映されない / 古い内容に戻る | effort-draft | [effort-draft/spec.md](effort-draft/spec.md) | INV-1（`clientUpdatedAt` で新しいほうを残す）、既知の落とし穴（端末の時計のずれ、ほぼ同時の保存） |
| 工数登録で入力していた内容が、次に開くと消えている | effort-draft | [effort-draft/spec.md](effort-draft/spec.md) | 既知の落とし穴（800 ミリ秒以内に画面を離れた、サーバーへの保存の失敗）、AC-10 |
| 工数登録画面を開いた直後に選んだ日付が入らない | effort-draft | [effort-draft/spec.md](effort-draft/spec.md) | 既知の落とし穴（読み込み中の仮の日付の選択） |
| 日曜日や月曜の朝に更新した進捗が、前週からの差分に正しく入らない | goals | [goals/spec.md](goals/spec.md) | ポストモーテム 2025-11-18（`108e691`）、既知の落とし穴（週の境目が UTC） |
| 前週から進捗を上げたのに、差分が +0.0% のまま | goals | [goals/spec.md](goals/spec.md) | AC-goals-10、既知の落とし穴（履歴の無い目標の前週の値）、INV-2 |
| 目標を追加したら、今の目標が一覧から消えた / 一部しか保存されていない | goals | [goals/spec.md](goals/spec.md) | INV-1、INV-3、INV-4、AC-goals-23、24（v1.2.0 で全部作るか何も作らないかにした）、既知の落とし穴（表の更新は一部だけ保存される） |
| 過去の目標の検索でエラーになる / エラーのトーストが何度も出る | goals | [goals/spec.md](goals/spec.md) | 既知の落とし穴（過去の目標の検索） |
| 週報の平均や合計が日別の時間と合わない / 日別の時間が長い小数になる | weekly-report | [weekly-report/spec.md](weekly-report/spec.md) | 既知の落とし穴（土日の工数、日別の時間の小数）、AC-04 |
| 週報の目標の差分や期待値がおかしい / 過去の週なのに今の進捗が出る | weekly-report | [weekly-report/spec.md](weekly-report/spec.md) | INV-1、INV-2、既知の落とし穴（週の境目、過去の週の目標の値、期待値、履歴の件数の上限） |
| 工数の送信に失敗して送り直したら 2 重に登録された / 一部だけ登録されている | effort-entry | [effort-entry/spec.md](effort-entry/spec.md) | ポストモーテム 2026-10-16（v1.1.3）、INV-5（1 回の送信は `save_work_records` の 1 回の呼び出し）、既知の落とし穴（送り直すと 2 重に登録される）、AC-06 |
| 工数の見積・実績に 100 以上や 99.995 を入れると送信できない（「0 以上 100 未満」） | effort-entry | [effort-entry/spec.md](effort-entry/spec.md) | AC-05、AC-17（小数第 2 位に丸めた値で決める。`isSavableWorkHours`） |
| 登録した新しい案件やタスクが候補に出てこない | effort-entry | [effort-entry/spec.md](effort-entry/spec.md) | INV-2、AC-07、既知の落とし穴（失敗した送信で作った案件） |
| 工数登録の完了メールが届かない | effort-entry | [effort-entry/spec.md](effort-entry/spec.md) | AC-09（送る条件）、既知の落とし穴（完了メールの失敗が記録されない） |
| 工数一覧の集計が、絞り込んだ全体の合計と合わない | effort-list | [effort-list/spec.md](effort-list/spec.md) | AC-10、既知の落とし穴（集計は表示中のページだけ） |
| 工数一覧のページを送ると、同じ行が 2 回出る / 出ない行がある | effort-list | [effort-list/spec.md](effort-list/spec.md) | AC-04、既知の落とし穴（ページ送りで重複や抜け） |
| 設定の画面で「設定の取得に失敗しました」が出る / メール通知の設定が保存されていない | user-settings | [user-settings/spec.md](user-settings/spec.md) | ポストモーテム 2025-11-17（`91bc403`）、INV-1、既知の落とし穴（行が無いと画面から直せない） |
| メール通知を切ったのに、工数登録の完了メールが届く | user-settings | [user-settings/spec.md](user-settings/spec.md) | AC-08、INV-2 |
| ログインしているのに、ランディングページやログインの画面に戻される | auth | [auth/spec.md](auth/spec.md) | AC-02、既知の落とし穴（通信が不安定、認証の状態の変化を聞いていない） |
| パスワード再設定のメールのリンクを開いても、新しいパスワードの入力に進まない | auth | [auth/spec.md](auth/spec.md) | AC-09、INV-4、既知の落とし穴（リンクの読み取りの競合） |
| iPhone でホーム画面に追加して開くと、下のナビが切れる | app-shell | [app-shell/spec.md](app-shell/spec.md) | ポストモーテム 2026-01-13（`5eb29b9`）、INV-2 |
| 画面が真っ白になる | app-shell | [app-shell/spec.md](app-shell/spec.md) | エラー時の挙動（画面全体のエラーの受け止めが無い） |
| アカウントの削除で失敗と出たのに、アカウントが消えている | profile | [profile/spec.md](profile/spec.md) | AC-14、既知の落とし穴（削除は途中で失敗しても戻らない） |
| プロフィール画像の保存に失敗したら、前の画像まで消えた | profile | [profile/spec.md](profile/spec.md) | AC-11、既知の落とし穴（画像の保存に失敗すると前の画像が消える） |
| どの画面でも通信がエラーになり、コンソールに CORS のエラーが出る | platform | [platform/spec.md](platform/spec.md) | AC-14、INV-5、既知の落とし穴（アクセスログが書けないと全部止まる） |
| エラーの画面やトーストに、DB のエラーの文がそのまま出る | platform | [platform/spec.md](platform/spec.md) | 既知の落とし穴（DB のエラーの文が応答に出る） |


## 直したあとにやること

バグを直したら、その場の修正で終わらせず、次の 3 つを必ず行う（`autonomous-impl` の工程 7 でも確認する）。

1. 該当する `spec.md` の **ポストモーテム** に 1 件追記する（日付、症状、真因、対策、再発時に確認すること）
2. frontmatter の `symptoms` に症状を足し、**この表に 1 行追加** する
3. **再発防止テスト** を追加する（先に落ちるテストを書く）
