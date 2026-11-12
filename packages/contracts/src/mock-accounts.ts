/** The accounts api-mock seeds. The login forms prefill the first one and list them all while the mock is on. */
export const MOCK_ACCOUNTS = [
  { key: "ada", email: "owner@sensical.test", password: "mesh-owner-12", name: "Ada Owner", role: "owner" },
  { key: "bo", email: "river@sensical.test", password: "mesh-owner-12", name: "Bo Owner", role: "owner" },
  { key: "admin", email: "admin@sensical.test", password: "mesh-admin-12", name: "Admin Superuser", role: "superuser" },
  { key: "operator", email: "operator@sensical.test", password: "mesh-operator-12", name: "Olu Operator", role: "operator" },
  { key: "staff", email: "staff@sensical.test", password: "mesh-staff-12", name: "Pat Staff", role: "staff" },
] as const;
