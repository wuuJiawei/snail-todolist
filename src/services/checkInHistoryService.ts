import { getDataProvider } from "@/data/createDataProvider";
import type { CheckInRecord } from "@/data/contracts/checkInRepository";

export const getCheckInsByRange = (fromIso: string, toIso: string): Promise<CheckInRecord[]> =>
  getDataProvider().checkIns.findByRange(fromIso, toIso);
