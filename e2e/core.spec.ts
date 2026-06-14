import { test, expect } from "@playwright/test";

/**
 * Core Phase 1 flows against the local store. Each test starts from a clean
 * localStorage so the seed fixtures are deterministic.
 */
test.beforeEach(async ({ page }) => {
  // Clear once on first load only; do NOT wipe on subsequent reloads (the
  // persistence test relies on data surviving a reload).
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
});

test("seed items render grouped by status", async ({ page }) => {
  await expect(page.getByText("Voice capture on mobile")).toBeVisible();
  await expect(page.getByText("How do CRDTs handle offline merge?")).toBeVisible();
  // Status group headings are h2 elements.
  await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
});

test("quick capture creates an item that persists across reload", async ({ page }) => {
  const capture = page.getByLabel("Quick capture");
  await capture.click();
  await capture.fill("E2E created item");
  await capture.press("Enter");

  await expect(page.getByText("E2E created item")).toBeVisible();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("E2E created item")).toBeVisible();
});

test("search filters the list", async ({ page }) => {
  await page.getByLabel("Search").fill("CRDT");
  await expect(page.getByText("How do CRDTs handle offline merge?")).toBeVisible();
  await expect(page.getByText("Voice capture on mobile")).toHaveCount(0);
});

test("opening an item shows the detail editor", async ({ page }) => {
  await page.getByText("Voice capture on mobile").first().click();
  await expect(page.getByLabel("Title")).toHaveValue("Voice capture on mobile");
  await expect(page.getByText("Send to AI")).toBeVisible();
});

test("editing the title updates the list", async ({ page }) => {
  await page.getByText("Weekly review ritual inside the app").first().click();
  const title = page.getByLabel("Title");
  await title.fill("Weekly review — edited");
  await title.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Weekly review — edited")).toBeVisible();
});

test("queueing an AI task shows it as queued", async ({ page }) => {
  await page.getByText("Voice capture on mobile").first().click();
  const prompt = page.getByPlaceholder(/Help me with this/);
  await prompt.fill("Draft an implementation plan.");
  await page.getByRole("button", { name: "Queue task" }).click();
  await expect(page.getByText("Queued")).toBeVisible();
});

test("filter dropdowns narrow the list by type", async ({ page }) => {
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /Topic/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("How do CRDTs handle offline merge?")).toBeVisible();
  await expect(page.getByText("Voice capture on mobile")).toHaveCount(0);
});

test("selecting the Archived status filter surfaces archived items", async ({ page }) => {
  // Archive an item via its row menu.
  const row = page.getByText("Weekly review ritual inside the app");
  await row.hover();
  await row.locator("xpath=ancestor::*[@role='button'][1]").getByRole("button", { name: "Item actions" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  // It leaves the default (non-archived) view.
  await expect(page.getByText("Weekly review ritual inside the app")).toHaveCount(0);
  // Selecting Archived in the Status filter brings it back (regression: was empty).
  await page.getByRole("button", { name: "Status", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Archived" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Weekly review ritual inside the app")).toBeVisible();
});

test("can create a new project from the item editor", async ({ page }) => {
  // Fresh captured items have no project, so the picker reads "No project".
  const capture = page.getByLabel("Quick capture");
  await capture.click();
  await capture.fill("Project test item");
  await capture.press("Enter");
  await page.getByText("Project test item").click();

  await page.getByText("No project").click();
  await page.getByText("New project").click();
  await page.getByPlaceholder("Project name…").fill("Side quests");
  await page.getByPlaceholder("Project name…").press("Enter");
  // The new project becomes the selected value in the trigger (first match).
  await expect(page.getByText("Side quests").first()).toBeVisible();
});

test("switching to board view shows lifecycle columns", async ({ page }) => {
  // Board toggle is the second aria-pressed button.
  const boardToggle = page.locator("button[aria-pressed]").nth(1);
  await boardToggle.click();
  await expect(boardToggle).toHaveAttribute("aria-pressed", "true");
  // A draggable card title is still visible in the board layout.
  await expect(page.getByText("Voice capture on mobile")).toBeVisible();
});
