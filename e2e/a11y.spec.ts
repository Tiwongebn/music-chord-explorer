import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.0–2.2 A and AA, plus axe's best practices.
const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`
  );
  expect(summary, "axe violations").toEqual([]);
}

const sections = [
  { path: "#/explore", heading: "Explore chords" },
  { path: "#/progressions", heading: "Chord Progressions" },
  { path: "#/trainer", heading: "ii–V–I trainer" },
];

for (const { path, heading } of sections) {
  test(`${path} has no axe violations and one h1`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.locator("h1:visible")).toHaveText(heading);
    await expect(page.locator("h1:visible")).toHaveCount(1);
    await expectNoViolations(page);
  });
}

test("progressions with chords, search results and an open editor", async ({
  page,
}) => {
  await page.goto("/#/progressions");
  const add = page.locator(".degree-add-btn");
  for (let i = 0; i < 3; i++) await add.nth(i).click();

  await page.getByLabel("Search for a song").fill("Let It Be");
  await page.getByRole("button", { name: "Mood or chords" }).click();
  await page.getByLabel("Search for a chord progression").fill("sad C minor");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Edit chord 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit chord 1" })).toBeFocused();

  await expectNoViolations(page);
});

test("every focusable control shows a focus indicator", async ({ page }) => {
  await page.goto("/#/explore");
  await page.mouse.click(1, 1);
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const visible = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return true;
      const style = getComputedStyle(el);
      return (
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none"
      );
    });
    expect(visible).toBe(true);
  }
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/#/explore");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("the piano is one Tab stop driven by arrow keys", async ({ page }) => {
  await page.goto("/#/explore");
  const piano = page.getByRole("group", { name: "Piano keys, C3 to B5" });
  await expect(piano.locator('[tabindex="0"]')).toHaveCount(1);
  await piano.locator('[tabindex="0"]').focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(piano.locator('[aria-pressed="true"]')).toHaveCount(1);
});

test("the URL keeps the section and its settings", async ({ page }) => {
  await page.goto("/#/progressions?key=Eb&scale=minor&p=Eb.1.4_Ab.1.4");
  await expect(page.locator(".builder-slot")).toHaveCount(2);
  await page.getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "Explore" })
    .click();
  await expect(page).toHaveURL(/#\/explore/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/progressions/);
  await expect(page.locator(".builder-slot")).toHaveCount(2);
});

test("Escape closes the metronome and returns focus", async ({ page }) => {
  await page.goto("/#/explore");
  const toggle = page.locator(".metronome-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});
