import { randomUUID } from "node:crypto";

import { expect, login, test } from "../support/fixtures.ts";

test("工数を登録すると、工数一覧に出る", async ({ page, user }) => {
  const project = `E2E 案件 ${randomUUID().slice(0, 8)}`;
  const task = "設計";
  await login(page, user);
  // 下書きの読み込みが終わるまでの日付の選択は仮のもので、選んでも反映されない（TODO(P6): 画面の不具合として
  // 改修の記録を通して直す。直したらこの待ち合わせは外す。docs/specs/effort-draft/spec.md の既知の落とし穴）
  const draftLoaded = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/effort/draft") &&
      res.request().method() === "GET",
  );
  await page.goto("/efforts/new");
  await draftLoaded;

  await page.getByRole("button", { name: "日付を選択" }).click();
  await page.getByRole("button", { name: /^Today,/ }).click();

  await page.getByRole("button", { name: "工数エントリーを追加" }).click();
  await page.getByRole("button", { name: "案件", exact: true }).click();
  await page.getByPlaceholder("案件を検索または入力").fill(project);
  await page.getByRole("button", { name: `"${project}" を追加` }).click();
  await page.getByRole("button", { name: "タスク", exact: true }).click();
  await page.getByPlaceholder("タスクを検索または入力").fill(task);
  await page.getByRole("button", { name: `"${task}" を追加` }).click();
  await page.getByRole("spinbutton", { name: "見積(h)" }).fill("2");
  await page.getByRole("spinbutton", { name: "実績(h)" }).fill("1.5");

  await page.getByRole("button", { name: "送信", exact: true }).click();
  await page.getByRole("button", { name: "送信する" }).click();
  await expect(page.getByText("工数を登録しました。")).toBeVisible();

  await page.goto("/efforts");
  const row = page.getByRole("row").filter({ hasText: project });
  await expect(row).toContainText(task);
  await expect(row).toContainText("2.00");
  await expect(row).toContainText("1.50");
});
