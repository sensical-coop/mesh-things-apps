import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../docs/openapi.yaml",
  output: "src/generated",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "../api-runtime.ts",
    },
    "@hey-api/typescript",
    {
      name: "zod",
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
