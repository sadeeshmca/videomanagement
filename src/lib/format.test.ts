import { describe, expect, it } from "vitest";
import { addMonths, daysLeftToRecover, formatBytes, isPastRetention, percentUsed, toCsv, whatsappLink } from "./format";

describe("format helpers", () => {
  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
  it("computes quota percent", () => {
    expect(percentUsed(50, 100)).toBe(50);
    expect(percentUsed(500, 100)).toBe(100);
    expect(percentUsed(5, 0)).toBe(0);
  });
  it("builds whatsapp links", () => {
    expect(whatsappLink("+91 98765 43210", "A1", "https://x")).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(whatsappLink(null, "A1", "https://x")).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
  it("handles retention and recovery", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    expect(isPastRetention("2026-01-01T00:00:00Z", 30, now)).toBe(true);
    expect(isPastRetention("2026-02-20T00:00:00Z", 30, now)).toBe(false);
    expect(daysLeftToRecover("2026-02-25T00:00:00Z", now)).toBe(26);
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 3).toISOString().slice(0, 10)).toBe("2026-04-15");
  });
  it("escapes csv", () => {
    expect(toCsv([{ a: "x,y", b: 1 }])).toBe('a,b\n"x,y",1');
  });
});
