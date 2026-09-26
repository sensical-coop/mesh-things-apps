import type { Source, SourceWrite } from "@mtt/domain/source/Source";
import { newId, nowIso } from "@mtt/domain/shared/ids";

export class MemorySources {
  readonly items = new Map<string, Source>();

  async list(): Promise<Source[]> {
    return [...this.items.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async get(id: string): Promise<Source | null> {
    return this.items.get(id) ?? null;
  }

  async insert(input: SourceWrite & { createdById: string }): Promise<Source> {
    const now = nowIso();
    const source: Source = {
      id: newId(),
      label: input.label ?? null,
      server: input.server,
      ssl: input.ssl ?? true,
      username: input.username ?? null,
      password: input.password ?? null,
      topic: input.topic,
      qos: input.qos ?? 1,
      createdById: input.createdById,
      termsAcceptedVersion: null,
      termsExpiresAt: null,
      pausedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(source.id, source);
    return source;
  }

  async update(id: string, patch: Partial<SourceWrite>): Promise<Source | null> {
    const source = this.items.get(id);
    if (!source) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) Object.assign(source, { [key]: value });
    }
    source.updatedAt = nowIso();
    return source;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
