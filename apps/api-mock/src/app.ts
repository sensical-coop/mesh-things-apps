import { Hono } from "hono";
import { cors } from "hono/cors";
import { TERMS_ENFORCED } from "./features/terms/terms";
import { createMockAuth, seedStore, type MockAuth } from "./auth";
import { INACTIVE_ALLOWED_PATHS, openPath, type Env } from "./http";
import { createRouteRuntime } from "./runtime";
import type { Store } from "./store";
import { registerArchiveRoutes } from "./routes/archive";
import { registerBlueprintRoutes } from "./routes/blueprint";
import { registerDataDeletionRoutes } from "./routes/data-deletion";
import { registerDeviceRoutes } from "./routes/device";
import { registerMeshRoutes } from "./routes/mesh";
import { registerOperatorRequestRoutes } from "./routes/operator-request";
import { registerOwnerRoutes } from "./routes/owner";
import { registerPostprocessingRoutes } from "./routes/postprocessing";
import { registerReadingsRoutes } from "./routes/readings";
import { registerSinkRoutes } from "./routes/sink";
import { registerSourceRoutes } from "./routes/source";

export type { Env };

export async function createApp(store?: Store, auth: MockAuth = createMockAuth()) {
  const db = store ?? (await seedStore(auth));
  const runtime = createRouteRuntime(db, auth);
  const app = new Hono<Env>();
  app.use(
    "*",
    cors({
      origin: (origin) =>
        origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")
          ? origin
          : undefined,
      credentials: true,
    }),
  );

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.use("*", async (c, next) => {
    if (c.req.method === "OPTIONS" || openPath(c.req.method, c.req.path)) return next();
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const actor = session ? db.actors.get(session.user.id) : undefined;
    if (!actor) {
      return c.json({ detail: "Authentication credentials were not provided." }, 401);
    }
    if (!actor.isActive && !INACTIVE_ALLOWED_PATHS.has(c.req.path)) {
      return c.json({ detail: "Your account is not active." }, 403);
    }
    c.set("actor", actor);
    await next();
  });

  const TERMS_ROUTE = /^\/(terms|meshes\/terms|sources\/terms|sinks\/terms|owners\/me\/terms-acceptance|(meshes|sources|sinks)\/[^/]+\/terms-acceptance)$/;
  app.use("*", async (c, next) => {
    if (!TERMS_ENFORCED && TERMS_ROUTE.test(c.req.path)) {
      return c.json({ detail: "Terms are not enforced on this instance" }, 404);
    }
    await next();
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  registerOwnerRoutes(app, runtime);
  registerMeshRoutes(app, runtime);
  registerDeviceRoutes(app, runtime);
  registerSourceRoutes(app, runtime);
  registerSinkRoutes(app, runtime);
  registerDataDeletionRoutes(app, runtime);
  registerOperatorRequestRoutes(app, runtime);
  registerBlueprintRoutes(app, runtime);
  registerPostprocessingRoutes(app, runtime);
  registerArchiveRoutes(app, runtime);
  registerReadingsRoutes(app, runtime);

  app.notFound((c) => c.json({ detail: "Not implemented" }, 501));
  return app;
}
