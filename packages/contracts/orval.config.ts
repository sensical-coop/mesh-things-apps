import { defineConfig, defineTransformer } from "orval";

type Schema = {
  $ref?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  default?: unknown;
};

const REF = "#/components/schemas/";

/** The schema without the properties `drop` rejects; `required` follows, and goes when empty. */
function withoutProperties(schema: Schema, drop: (property: Schema) => boolean, map = (property: Schema) => property): Schema {
  if (!schema.properties) return { ...schema };
  const properties = Object.fromEntries(
    Object.entries(schema.properties)
      .filter(([, property]) => !drop(property))
      .map(([key, property]) => [key, map(property)]),
  );
  const { required: _, ...rest } = schema;
  const required = schema.required?.filter((key) => key in properties) ?? [];
  return required.length ? { ...rest, properties, required } : { ...rest, properties };
}

/** The schema without `default`, through inline properties and items; `$ref`s are their own components. */
function withoutDefaults(schema: Schema): Schema {
  const { default: _, ...rest } = schema;
  const result = withoutProperties(rest, () => false, withoutDefaults);
  if (schema.items) result.items = withoutDefaults(schema.items);
  for (const key of ["allOf", "oneOf", "anyOf"] as const) {
    if (schema[key]) result[key] = schema[key].map(withoutDefaults);
  }
  return result;
}

/**
 * drf-spectacular puts request and response fields in one component (`readOnly` / `writeOnly`),
 * and Orval's Zod schemas serve both directions. A request body that differs gets its own
 * `<Name>Request` component without `readOnly` fields (drf-spectacular's own naming); the
 * original keeps the response shape, without `writeOnly` fields or `default`s: the API always
 * sends those, and a Zod default would type them optional (the mutator keeps Orval's input types).
 * shortcut: split here, not in the API; drop it once the API sets COMPONENT_SPLIT_REQUEST.
 */
const splitRequestSchemas = defineTransformer((spec) => {
  const schemas = (spec.components?.schemas ?? {}) as Record<string, Schema>;
  const originals = Object.keys(schemas);
  const requests = new Map<string, string>();

  function requestName(name: string): string {
    const known = requests.get(name);
    if (known) return known;
    requests.set(name, name); // cycle guard: a self-reference keeps the original
    const original = schemas[name];
    const request = original && toRequest(original);
    const split = request !== undefined && JSON.stringify(request) !== JSON.stringify(original);
    const result = split ? `${name}Request` : name;
    if (split && originals.includes(result)) throw new Error(`${result} is already a schema in the spec`);
    if (split) schemas[result] = request;
    requests.set(name, result);
    return result;
  }

  function toRequest(schema: Schema): Schema {
    if (schema.$ref?.startsWith(REF)) return { ...schema, $ref: REF + requestName(schema.$ref.slice(REF.length)) };
    const request = withoutProperties(schema, (property) => property.readOnly === true, toRequest);
    if (schema.items) request.items = toRequest(schema.items);
    for (const key of ["allOf", "oneOf", "anyOf"] as const) {
      if (schema[key]) request[key] = schema[key].map(toRequest);
    }
    return request;
  }

  for (const path of Object.values(spec.paths ?? {})) {
    for (const operation of Object.values(path ?? {}) as { requestBody?: { content?: Record<string, { schema?: Schema }> } }[]) {
      for (const media of Object.values(operation?.requestBody?.content ?? {})) {
        if (media.schema) media.schema = toRequest(media.schema);
      }
    }
  }

  for (const name of originals) {
    // A component sent unchanged as a body keeps its writeOnly fields.
    if (requests.get(name) === name) continue;
    schemas[name] = withoutDefaults(withoutProperties(schemas[name]!, (property) => property.writeOnly === true));
  }
  return spec;
});

export default defineConfig({
  api: {
    input: { target: "../../docs/openapi.json", override: { transformer: splitRequestSchemas } },
    output: {
      mode: "single",
      target: "src/generated/api.ts",
      schemas: { path: "src/generated/model.zod.ts", type: "zod", mode: "single" },
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: { path: "src/api-runtime.ts", name: "apiFetch" },
        includeZodSchemaInArguments: true,
        fetch: { runtimeValidation: true, includeHttpResponseReturnType: false },
      },
    },
  },
});
