import type { CheckInRepository } from "@/data/contracts/checkInRepository";
import type { SupabaseAdapter } from "./SupabaseAdapter";
import { mapCheckInRow } from "./mappers";
import { withSupabaseError } from "./mapSupabaseError";

export class SupabaseCheckInRepository implements CheckInRepository {
  constructor(private readonly adapter: SupabaseAdapter) {}

  hasCheckedInToday() { return withSupabaseError(() => this.adapter.hasCheckedInToday()); }

  create(note?: string) {
    return withSupabaseError(async () => mapCheckInRow(await this.adapter.createCheckIn(note)));
  }

  findHistory(page?: number, pageSize?: number) {
    return withSupabaseError(async () => {
      const result = await this.adapter.getCheckInHistory(page, pageSize);
      return { records: result.records.map(mapCheckInRow), total: result.total };
    });
  }

  getStreak() { return withSupabaseError(() => this.adapter.getCheckInStreak()); }
}
