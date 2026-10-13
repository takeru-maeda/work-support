import { expect, login, test } from "../support/fixtures.ts";

test("登録済みのユーザーでログインすると、名前入りのホームが開く", async ({
  page,
  user,
}) => {
  await login(page, user);
  await expect(page).toHaveURL("/");
});

test("ログインしていないと、工数登録の画面を開けない", async ({ page }) => {
  await page.goto("/efforts/new");
  await expect(page).not.toHaveURL(/\/efforts\/new$/);
  await expect(
    page.getByRole("heading", { name: "工数登録", level: 1 }),
  ).toHaveCount(0);
});
