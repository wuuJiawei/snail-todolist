import type { CheckInRepository } from "@/data/contracts/checkInRepository";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { SupabaseAdapterBridge } from "./adapterBridge";
import { mapCheckInRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseCheckInRepository extends SupabaseAdapterBridge implements CheckInRepository {
  constructor(adapter: SupabaseAdapter) { super(adapter); }

  hasCheckedInToday() { return withSupabaseError(() => this.ready().then((adapter) => adapter.hasCheckedInToday())); }

  create(note?: string) {
    return withSupabaseError(async () => mapCheckInRow(await (await this.ready()).createCheckIn(note)));
  }

  findHistory(page?: number, pageSize?: number) {
    return withSupabaseError(async () => {
      const result = await (await this.ready()).getCheckInHistory(page, pageSize);
      return { records: result.records.map(mapCheckInRow), total: result.total };
    });
  }

  getStreak() { return withSupabaseError(() => this.ready().then((adapter) => adapter.getCheckInStreak())); }
}
