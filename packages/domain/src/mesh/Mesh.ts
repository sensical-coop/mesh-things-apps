/** The version a new mesh is declared on, as in the API. */
export const DEFAULT_PROTOCOL = "2.8";

type MeshProps = {
  id: string;
  channelId: string;
  pskB64: string;
  label: string | null;
  ownerId: string;
  isPublic?: boolean;
  /** Null when the traffic arrives on this instance's own broker. */
  sourceId?: string | null;
  /** Registers gateways whose packets decode with the mesh's channel and PSK. */
  discoverGateways?: boolean;
  /** Meshtastic protocol version its packets are decoded with. */
  protocol?: string;
  /** Mesh terms on the default broker: version accepted, when they lapse, and since when paused. */
  termsAcceptedVersion?: string | null;
  termsExpiresAt?: string | null;
  pausedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeshCreate = {
  channelId: string;
  pskB64: string;
  label?: string | null;
  ownerId: string;
  isPublic?: boolean;
  sourceId?: string | null;
  discoverGateways?: boolean;
  protocol?: string;
};

export class Mesh implements MeshProps {
  readonly id: string;
  channelId: string;
  pskB64: string;
  label: string | null;
  readonly ownerId: string;
  isPublic: boolean;
  sourceId: string | null;
  discoverGateways: boolean;
  protocol: string;
  termsAcceptedVersion: string | null;
  termsExpiresAt: string | null;
  pausedAt: string | null;
  readonly createdAt: string;
  updatedAt: string;

  constructor(props: MeshProps) {
    if (!props.pskB64) throw new Error("psk required");
    if (!props.channelId) throw new Error("channel_id required");
    this.id = props.id;
    this.channelId = props.channelId;
    this.pskB64 = props.pskB64;
    this.label = props.label;
    this.ownerId = props.ownerId;
    this.isPublic = props.isPublic ?? false;
    this.sourceId = props.sourceId ?? null;
    this.discoverGateways = props.discoverGateways ?? false;
    this.protocol = props.protocol ?? DEFAULT_PROTOCOL;
    this.termsAcceptedVersion = props.termsAcceptedVersion ?? null;
    this.termsExpiresAt = props.termsExpiresAt ?? null;
    this.pausedAt = props.pausedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
