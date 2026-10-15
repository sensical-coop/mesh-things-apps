import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";

const pages = [
  "overview",
  "concepts",
  "accounts",
  "meshes",
  "devices",
  "readings",
  "quality",
  "blueprints",
  "sources",
  "sinks",
  "archive",
  "network",
  "architecture",
  "data",
];

test("Fumadocs serves the same documentation pages in English and Spanish", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    plugins: [fumadocsMdx()],
    server: { middlewareMode: true },
  });
  try {
    const { docsSource } = await server.ssrLoadModule("/src/lib/docs-source.ts");
    for (const language of ["en", "es"]) {
      assert.equal(docsSource.getPages(language).length, pages.length);
      for (const slug of pages) {
        const page = docsSource.getPage([slug], language);
        assert.equal(page?.url, `/docs/${slug}`);
        assert.equal(typeof page?.data.title, "string");
        assert.equal(typeof page?.data.body, "function");
      }
    }
    const overview = docsSource.getPage(["overview"], "es");
    assert.equal(overview?.data.title, "Visión general");
    assert.equal(docsSource.getPage(["missing-page"]), undefined);
  } finally {
    await server.close();
  }
});
