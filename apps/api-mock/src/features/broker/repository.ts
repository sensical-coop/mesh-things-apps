import type { GatewayBroker } from "@mtt/contracts";

/** `MOCK_GATEWAY_BROKER_HOST` unset means the instance has no gateway broker (404). */
export function gatewayBrokerFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayBroker | null {
  const host = env.MOCK_GATEWAY_BROKER_HOST;
  if (!host) return null;
  const port = Number(env.MOCK_GATEWAY_BROKER_PORT ?? 8883);
  const tls = env.MOCK_GATEWAY_BROKER_TLS;
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : 8883,
    tls: tls !== "false" && tls !== "0",
    username: env.MOCK_GATEWAY_BROKER_USERNAME ?? "",
    password: env.MOCK_GATEWAY_BROKER_PASSWORD ?? "",
  };
}
