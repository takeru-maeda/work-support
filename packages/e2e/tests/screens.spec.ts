import { expect, login, test } from "../support/fixtures.ts";

const SCREENS = [
  { path: "/", heading: "Work Support" },
  { path: "/efforts/new", heading: "工数登録" },
  { path: "/efforts", heading: "工数一覧" },
  { path: "/goals", heading: "目標管理" },
  { path: "/weekly-report", heading: "週報出力" },
] as const;

// 3 幅（projects の mobile / tablet / desktop）それぞれで回る
test("登録したばかりのユーザーで、主な画面が開き、横にはみ出さない", async ({
  page,
  user,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, user);

  for (const screen of SCREENS) {
    await test.step(screen.path, async () => {
      await page.goto(screen.path);
      await expect(
        page.getByRole("heading", { name: screen.heading, level: 1 }),
      ).toBeVisible();
      const overflow: number = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, "横スクロールが出ている").toBeLessThanOrEqual(0);
    });
  }
  expect(errors, "画面で例外が起きた").toEqual([]);
});
