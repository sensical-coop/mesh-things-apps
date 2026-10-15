import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";

test("Fumadocs compiles Hello world and rejects unknown documentation slugs", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    plugins: [fumadocsMdx()],
    server: { middlewareMode: true },
  });
  try {
    const { docsSource } = await server.ssrLoadModule("/src/lib/docs-source.ts");
    const page = docsSource.getPage(["hello-world"]);
    assert.equal(page?.data.title, "Hello world");
    assert.equal(page?.url, "/docs/hello-world");
    assert.equal(typeof page?.data.body, "function");
    assert.equal(docsSource.getPage(["missing-page"]), undefined);
    assert.equal(docsSource.getPages().length, 1);
  } finally {
    await server.close();
  }
});
