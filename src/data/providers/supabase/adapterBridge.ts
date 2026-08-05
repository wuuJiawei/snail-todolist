import { SupabaseAdapter } from "./SupabaseAdapter";

export class SupabaseAdapterBridge {
  constructor(protected readonly adapter: SupabaseAdapter) {}

  protected async ready(): Promise<SupabaseAdapter> {
    if (!this.adapter.isReady()) await this.adapter.initialize();
    return this.adapter;
  }
}
