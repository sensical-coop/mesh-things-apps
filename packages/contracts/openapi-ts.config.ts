import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../docs/openapi.yaml",
  output: "src/generated",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/api-runtime.ts",
    },
    "@hey-api/typescript",
    {
      name: "zod",
      // v0.95+ inlines request envelopes unless this is set. Forms and the mock parse z*Data.
      requests: { shouldExtract: true },
    },
    {
      name: "@hey-api/sdk",
      validator: true,
    },
    {
      name: "@tanstack/react-query",
      queryOptions: true,
      mutationOptions: true,
    },
  ],
});
