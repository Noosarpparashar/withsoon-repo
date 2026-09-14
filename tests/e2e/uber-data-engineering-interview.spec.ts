import { expect, test } from "@playwright/test";

test.describe("Uber Data Engineering - Interview Q&A", () => {
  test("renders the complete interview chapter", async ({ page }) => {
    await page.goto("/data-engineering/uber/quiz");
    await expect(
      page.getByRole("heading", {
        name: "Uber Data Engineering Interview Q&A",
      }),
    ).toBeVisible();

    for (const heading of ["Question bank", "Whiteboard order"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    await expect(page.getByText("39 likely follow-ups")).toBeVisible();
    await expect(page.getByText("Answer depth")).toHaveCount(0);
    await expect(page.getByText("Rapid revision")).toHaveCount(0);
  });

  test("answers the regional architecture boundary clearly", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");

    await page
      .getByRole("button", { name: /regional and global data architecture/i })
      .hover();
    await expect(page.getByTestId("interview-answer")).toContainText(
      "latency-sensitive ingestion",
    );
    await expect(page.getByTestId("interview-answer")).toContainText(
      "global control plane",
    );
    await expect(page.getByText(/designing Uber dispatch itself/i)).toHaveCount(
      0,
    );
  });

  test("switches categories and reveals Uber-specific answers", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");

    await page.getByRole("button", { name: /Kafka \+ Flink/ }).click();
    await page
      .getByRole("button", { name: /exactly-once for payments/i })
      .hover();
    await expect(page.getByTestId("interview-answer")).toContainText(
      "idempotency",
    );
    await expect(page.getByTestId("interview-answer")).toContainText(
      "settlement reconciliation",
    );

    await page.getByRole("button", { name: /Lakehouse \+ model/ }).click();
    await page.getByRole("button", { name: /grain of fact_trip/i }).hover();
    await expect(page.getByTestId("interview-answer")).toContainText(
      "one row per trip request",
    );
    await expect(page.getByTestId("interview-answer")).toContainText(
      "fact_trip_event",
    );
  });

  test("includes the expanded design interview question set", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");
    await expect(
      page.getByRole("button", { name: /end-to-end pipeline/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /millions of GPS location updates/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Quality \+ operations/ }).click();
    await page
      .getByRole("button", { name: /sudden drop in completed-trip counts/i })
      .hover();
    await expect(page.getByTestId("interview-answer")).toContainText(
      "last good snapshot",
    );
  });

  test("provides a reviewed design, trade-off, and validation for all 39 questions", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");
    let reviewed = 0;
    for (const category of [
      /Architecture/,
      /Kafka \+ Flink/,
      /Lakehouse \+ model/,
      /Quality \+ operations/,
    ]) {
      await page.getByRole("button", { name: category }).click();
      const questions = page.getByTestId("interview-question");
      const count = await questions.count();
      reviewed += count;
      for (let index = 0; index < count; index += 1) {
        await questions.nth(index).hover();
        const answer = page.getByTestId("interview-answer");
        await expect(answer).toContainText("Proposed design");
        await expect(answer).toContainText("Critical trade-off");
        await expect(answer).toContainText("How I would validate");
        expect((await answer.innerText()).length).toBeGreaterThan(450);
      }
    }
    expect(reviewed).toBe(39);
    await expect(page.getByText("Uber proof")).toHaveCount(0);
  });

  test("shows the whiteboard sequence as five connected phases", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");
    for (const phase of ["Frame", "Size", "Draw", "Deep dive", "Close"]) {
      await expect(page.getByRole("heading", { name: phase })).toBeVisible();
    }
    await expect(page.getByText("Producers to regional Kafka")).toBeVisible();
    await expect(page.getByText(/one failure end to end/i)).toBeVisible();
  });

  test("anchors navigate and mobile does not overflow", async ({ page }) => {
    await page.goto("/data-engineering/uber/quiz");
    await page.getByTestId("stage-nav-whiteboard-order").click();
    await expect(page).toHaveURL(/#whiteboard-order$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  test("is the final chapter and replaces the removed cheat sheet", async ({
    page,
  }) => {
    await page.goto("/data-engineering/uber/quiz");
    await expect(page.getByRole("link", { name: /Cheat Sheet/i })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("chapter-rail")).toContainText("9 chapters");

    await page.goto("/data-engineering/uber/cheat-sheet");
    await expect(page).toHaveURL(/\/data-engineering\/uber\/quiz$/);
  });

  test("distributes all nine desktop chapter tabs evenly", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/data-engineering/uber/quiz");
    const tabs = page.getByTestId("chapter-rail").getByRole("link");
    await expect(tabs).toHaveCount(9);
    const widths = await tabs.evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().width),
    );
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2);
    await expect(
      page.getByRole("button", { name: "Previous chapters" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Next chapters" }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("button", { name: "Previous chapters" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next chapters" }),
    ).toBeVisible();
  });
});
