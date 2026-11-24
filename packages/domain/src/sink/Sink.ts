/**
 * Readings a third party subscribes to on this instance's broker, from the meshes and
 * devices an operator attaches.
 */
export type Sink = {
  id: string;
  label: string | null;
  streams: string[];
  /** Meshes whose every node is sent, including nodes that appear later. */
  meshIds: string[];
  /** Registrations (`uuid`) of single devices. */
  deviceIds: string[];
  /** The consumer's password: shown once when set, never returned afterwards. */
  password: string;
  createdById: string | null;
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SinkPatch = Partial<Pick<Sink, "label" | "streams" | "meshIds" | "deviceIds">>;
