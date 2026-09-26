import { beforeEach, describe, expect, it, vi } from "vitest";

const localAuthentication = vi.hoisted(() => ({
  hasHardwareAsync: vi.fn(async () => true),
  isEnrolledAsync: vi.fn(async () => true),
  authenticateAsync: vi.fn(async () => ({ success: true })),
}));

vi.mock("expo-local-authentication", () => localAuthentication);
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

import {
  authenticateForBiometricLogin,
  biometricLoginAvailable,
} from "./biometric";

describe("biometric authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires available hardware and enrollment before prompting", async () => {
    expect(await biometricLoginAvailable()).toBe(true);
    expect(localAuthentication.hasHardwareAsync).toHaveBeenCalledOnce();
    expect(localAuthentication.isEnrolledAsync).toHaveBeenCalledOnce();
  });

  it("uses one native authentication prompt for an explicit unlock", async () => {
    expect(await authenticateForBiometricLogin()).toBe(true);
    expect(localAuthentication.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: "Unlock Investory Accounting",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
  });

  it("propagates a cancelled or failed native authentication as false", async () => {
    localAuthentication.authenticateAsync.mockResolvedValueOnce({
      success: false,
    });
    await expect(authenticateForBiometricLogin()).resolves.toBe(false);
  });
});
