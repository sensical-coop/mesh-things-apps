import assert from "node:assert/strict";
import test from "node:test";
import { isExportStorageMissing } from "../src/features/export/storage-missing.ts";

test("no object storage is the bare 404, other export 404s are not", () => {
  assert.equal(isExportStorageMissing({ status: 404, detail: "Not found" }), true);
  assert.equal(isExportStorageMissing({ status: 404, detail: "Mesh not found" }), false);
  assert.equal(isExportStorageMissing({ status: 404, detail: "Nothing archived in that range" }), false);
  assert.equal(isExportStorageMissing({ status: 403, detail: "Not found" }), false);
});
