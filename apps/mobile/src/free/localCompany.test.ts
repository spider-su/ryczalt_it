import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ secure: null as string | null, file: null as string | null, rejectWrite: false }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  getItemAsync: vi.fn(async () => state.secure),
  setItemAsync: vi.fn(async (_key: string, value: string) => { if (state.rejectWrite) throw new Error("failed"); state.secure = value; }),
  deleteItemAsync: vi.fn(async () => { state.secure = null; }),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///test/",
  getInfoAsync: vi.fn(async () => ({exists: state.file !== null})),
  readAsStringAsync: vi.fn(async () => state.file),
  deleteAsync: vi.fn(async () => { state.file = null; }),
}));
import { loadCompany } from "./localCompany";
const profile = JSON.stringify({ nip: "8133703437", name: "Sample", retrievedAt: "2026-01-01T00:00:00Z" });
beforeEach(() => { state.secure = null; state.file = null; state.rejectWrite = false; });
describe("company migration", () => {
  it("moves a valid draft profile to SecureStore before deleting the file", async () => {
    state.file = profile;
    expect(await loadCompany()).toMatchObject({nip: "8133703437"});
    expect(state.secure).toBe(profile);
    expect(state.file).toBeNull();
  });
  it("preserves the draft profile if secure storage fails", async () => {
    state.file = profile; state.rejectWrite = true;
    await expect(loadCompany()).rejects.toThrow();
    expect(state.file).toBe(profile);
  });
  it("preserves conflicting valid profiles for recovery", async () => {
    state.file = profile; state.secure = JSON.stringify({ nip: "1234567890", name: "Other", retrievedAt: "2026-01-01T00:00:00Z" });
    await expect(loadCompany()).rejects.toThrow("Niezgodne");
    expect(state.file).toBe(profile);
  });
  it("does not delete a draft profile when secure data is corrupt", async () => {
    state.file = profile; state.secure = "invalid";
    await expect(loadCompany()).rejects.toThrow();
    expect(state.file).toBe(profile);
  });
});
