import { defineConfig } from "fumadocs-mdx/config";
import { remarkDiagrams } from "./src/lib/remark-diagrams.ts";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkDiagrams],
  },
});
