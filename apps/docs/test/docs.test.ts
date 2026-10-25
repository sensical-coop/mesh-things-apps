import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createServer } from "vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";

// meta.json orders the sidebar; "---Title---" entries are separators, not pages.
const meta: { pages: string[] } = JSON.parse(readFileSync(new URL("../content/docs/en/meta.json", import.meta.url), "utf8"));
const pages = meta.pages.filter((entry) => !entry.startsWith("---"));

test("Fumadocs serves the same documentation pages in English and Spanish", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    plugins: [fumadocsMdx()],
    server: { middlewareMode: true },
  });
  try {
    const { docsSource } = await server.ssrLoadModule("/src/lib/source.ts");
    for (const language of ["en", "es"]) {
      assert.equal(docsSource.getPages(language).length, pages.length);
      for (const slug of pages) {
        const page = docsSource.getPage([slug], language);
        assert.equal(page?.url, `/${slug}`);
        assert.equal(typeof page?.data.title, "string");
        assert.equal(typeof page?.data.body, "function");
      }
    }
    assert.deepEqual(
      JSON.parse(readFileSync(new URL("../content/docs/es/meta.json", import.meta.url), "utf8")).pages.filter(
        (entry: string) => !entry.startsWith("---"),
      ),
      pages,
    );
    const overview = docsSource.getPage(["overview"], "es");
    assert.equal(overview?.data.title, "Visión general");
    assert.equal(docsSource.getPage(["missing-page"]), undefined);
  } finally {
    await server.close();
  }
});
