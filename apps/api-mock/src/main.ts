import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);

const app = await createApp();
serve({ fetch: app.fetch, port }, () => {
  console.log(`api-mock http://localhost:${port}`);
  console.log("seeded owners: owner@sensical.test river@sensical.test admin@sensical.test staff@sensical.test");
});
