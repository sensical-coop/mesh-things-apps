import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import { OperatorRequestCreate, OperatorRequestDecision, OperatorRequestStatusEnum } from "@mtt/contracts";
import { canDecideOperatorRequests, canRequestOperator } from "@mtt/contracts/authz";
import { Hono } from "hono";
import {
  createOperatorRequest,
  decideOperatorRequest,
  findOperatorRequest,
  latestOperatorRequest,
  listOperatorRequests,
} from "../features/operator-request/repository";
import { operatorRequestAdminJson, operatorRequestJson } from "../serialize";
import { NO_PERMISSION, parseBody, statusFilterError } from "../http";

export function registerOperatorRequestRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, syncArchive } = rt;

  app.get("/owners/me/operator-request", (c) => {
    const latest = latestOperatorRequest(db.operatorRequests, c.get("actor").id);
    if (!latest) return c.json({ detail: "No operator request" }, 404);
    return c.json(operatorRequestJson(latest));
  });

  app.post("/owners/me/operator-request", async (c) => {
    const actor = c.get("actor");
    if (!canRequestOperator(actor)) return c.json({ detail: "You are already an operator" }, 409);
    const parsed = await parseBody(c, OperatorRequestCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = createOperatorRequest(db.operatorRequests, actor.id, parsed.data.reason);
    if ("blank" in created) return c.json({ reason: ["This field may not be blank."] }, 400);
    if ("pending" in created) return c.json({ detail: "You already have a pending operator request" }, 409);
    console.info(`[mock] operator request from ${actor.email}: /console/operator-requests/${created.row.id}`);
    return c.json(operatorRequestJson(created.row), 201);
  });

  app.get("/operator-requests", (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(NO_PERMISSION, 403);
    const wanted = c.req.query("status") ?? "pending";
    const statusError = statusFilterError(OperatorRequestStatusEnum.options, wanted);
    if (statusError) return c.json(statusError, 400);
    return c.json(listOperatorRequests(db.operatorRequests, wanted).map((row) => operatorRequestAdminJson(row, db.actors.get(row.ownerId))));
  });

  app.get("/operator-requests/:request_id", (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(NO_PERMISSION, 403);
    const row = findOperatorRequest(db.operatorRequests, c.req.param("request_id"));
    if (!row) return c.json({ detail: "Operator request not found" }, 404);
    return c.json(operatorRequestAdminJson(row, db.actors.get(row.ownerId)));
  });

  app.put("/operator-requests/:request_id", async (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(NO_PERMISSION, 403);
    const row = findOperatorRequest(db.operatorRequests, c.req.param("request_id"));
    if (!row) return c.json({ detail: "Operator request not found" }, 404);
    const parsed = await parseBody(c, OperatorRequestDecision);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const decided = await decideOperatorRequest(db, actor, row, parsed.data.decision, parsed.data.note, syncArchive);
    if ("already" in decided) return c.json({ detail: `This request was already ${decided.already}` }, 409);
    return c.json(operatorRequestAdminJson(decided.row, db.actors.get(decided.row.ownerId)));
  });
}
