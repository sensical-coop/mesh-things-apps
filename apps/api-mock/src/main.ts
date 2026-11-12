import { serve } from "@hono/node-server";
import { MOCK_ACCOUNTS } from "@mtt/contracts/mock-accounts";
import { DEV_PORTS } from "@mtt/contracts/site";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? DEV_PORTS.api);

const app = await createApp();
serve({ fetch: app.fetch, port }, () => {
  console.log(`api-mock http://localhost:${port}`);
  console.log(`seeded owners: ${MOCK_ACCOUNTS.map((account) => account.email).join(" ")}`);
});
