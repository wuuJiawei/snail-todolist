import { describe, expect, it } from "vitest";
import { mapCheckInRow, mapFileRow, mapPomodoroRow, mapTaskRow } from "./mappers";

describe("Supabase row mappers", () => {
  it("maps serialized task attachments without exposing row parsing", () => {
    const task = mapTaskRow({
      id: "task-1",
      title: "Mapped",
      completed: false,
      attachments: JSON.stringify([{ id: "file-1", filename: "a.txt", original_name: "a.txt", url: "/a", size: 1, type: "text/plain", uploaded_at: "2026-08-05" }]),
    });
    expect(task.attachments).toHaveLength(1);
    expect(task.attachments?.[0].original_name).toBe("a.txt");
  });

  it("normalizes legacy attachment fields and nullable task state", () => {
    const task = mapTaskRow({
      id: "task-1",
      title: "Mapped",
      completed: false,
      sort_order: "1000",
      deleted: null,
      abandoned: null,
      flagged: null,
      attachments: [{
        id: "file-1",
        file_name: "stored.txt",
        original_name: "a.txt",
        url: "/a",
        file_size: 1,
        file_type: "text/plain",
        uploaded_at: "2026-08-05",
      }],
    });
    expect(task).toMatchObject({ sort_order: 1000, deleted: false, abandoned: false, flagged: false });
    expect(task.attachments?.[0]).toMatchObject({ filename: "stored.txt", size: 1, type: "text/plain" });
  });

  it("maps check-in and pomodoro timestamps to domain names", () => {
    expect(mapCheckInRow({ id: "c1", check_in_time: "start", created_at: "created" })).toEqual({
      id: "c1", checkInTime: "start", createdAt: "created",
    });
    expect(mapPomodoroRow({
      id: "p1", start_time: "start", end_time: "end", duration: 25,
      type: "focus", completed: true,
    })).toMatchObject({ id: "p1", startTime: "start", endTime: "end", type: "focus" });
  });

  it("maps storage metadata to a provider-neutral file model", () => {
    expect(mapFileRow({
      id: "f1", filename: "stored.txt", original_name: "a.txt", url: "/a",
      size: 1, type: "text/plain", uploaded_at: "now",
    })).toMatchObject({ originalName: "a.txt", uploadedAt: "now" });
  });
});
