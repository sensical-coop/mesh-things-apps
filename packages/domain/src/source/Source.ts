/** A remote MQTT broker and topic filter, bridged into this instance. */
export type Source = {
  id: string;
  label: string | null;
  /** host:port */
  server: string;
  ssl: boolean;
  username: string | null;
  /** Accepted on writes, never returned. */
  password: string | null;
  topic: string;
  qos: number;
  createdById: string | null;
  /** The source terms accepted for it, when they lapse (null: never), and since when it is paused. */
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceWrite = Pick<Source, "server" | "topic"> &
  Partial<Pick<Source, "label" | "ssl" | "username" | "password" | "qos">>;
