export type MeshProps = {
  id: string;
  channelId: string;
  pskB64: string;
  label: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type MeshCreate = {
  channelId: string;
  pskB64: string;
  label?: string | null;
  ownerId: string;
};

/** Public list row: PSK stays off this shape. */
export type MeshListItem = Omit<MeshProps, "pskB64">;

export class Mesh implements MeshProps {
  readonly id: string;
  channelId: string;
  pskB64: string;
  label: string | null;
  readonly ownerId: string;
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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toListItem(): MeshListItem {
    return {
      id: this.id,
      channelId: this.channelId,
      label: this.label,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function meshFilterValue(mesh: Mesh, field: string): string | undefined {
  switch (field) {
    case "label":
      return mesh.label ?? "";
    case "channel_id":
      return mesh.channelId;
    default:
      return undefined;
  }
}
