import type { GatewayBroker } from "@mtt/contracts";
import { MQTT_TLS_PORT } from "@mtt/contracts/source";

/** `MOCK_GATEWAY_BROKER_HOST` unset means the instance has no gateway broker (404). */
export function gatewayBrokerFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayBroker | null {
  const host = env.MOCK_GATEWAY_BROKER_HOST;
  if (!host) return null;
  const port = Number(env.MOCK_GATEWAY_BROKER_PORT ?? MQTT_TLS_PORT);
  const tls = env.MOCK_GATEWAY_BROKER_TLS;
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : MQTT_TLS_PORT,
    tls: tls !== "false" && tls !== "0",
    username: env.MOCK_GATEWAY_BROKER_USERNAME ?? "",
    password: env.MOCK_GATEWAY_BROKER_PASSWORD ?? "",
  };
}
