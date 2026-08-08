export interface CheckInRecord {
  id: string;
  checkInTime: string;
  note?: string | null;
  createdAt: string;
}

export interface CheckInPage {
  records: CheckInRecord[];
  total: number;
}

export interface CheckInRepository {
  hasCheckedInToday(): Promise<boolean>;
  create(note?: string): Promise<CheckInRecord>;
  findHistory(page?: number, pageSize?: number): Promise<CheckInPage>;
  findByRange(fromIso: string, toIso: string): Promise<CheckInRecord[]>;
  getStreak(): Promise<number>;
}
