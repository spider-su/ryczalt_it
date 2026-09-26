import { describe, expect, it } from "vitest";
import { paymentInstructionFor } from "./paymentInstruction";
import type { Obligation } from "../model/accounting";

const obligation = (overrides: Partial<Obligation> = {}): Obligation => ({
  id: "vat",
  title: "VAT",
  period: "2026-08",
  dueDate: "2026-09-25",
  amount: { amount: "5969.00", currency: "PLN" },
  paidAmount: { amount: "0.00", currency: "PLN" },
  outstandingAmount: { amount: "5969.00", currency: "PLN" },
  status: "OPEN",
  paymentInstruction: {
    kind: "TAX",
    recipientName: "Urząd Skarbowy",
    accountNumber: "PL123",
    amount: { amount: "5969.00", currency: "PLN" },
    title: "VAT 08/2026",
    qrPayload: "payload",
  },
  ...overrides,
});

describe("payment instruction presentation", () => {
  it("allows instructions whose amount matches the outstanding balance", () => {
    expect(paymentInstructionFor(obligation())?.accountNumber).toBe("PL123");
  });
  it("hides stale instructions when a partial payment changes the balance", () => {
    expect(
      paymentInstructionFor(
        obligation({
          outstandingAmount: { amount: "4769.00", currency: "PLN" },
        }),
      ),
    ).toBeNull();
  });
  it("hides instructions with a different currency", () => {
    expect(
      paymentInstructionFor(
        obligation({
          paymentInstruction: {
            ...obligation().paymentInstruction!,
            amount: { amount: "5969.00", currency: "EUR" },
          },
        }),
      ),
    ).toBeNull();
  });
});
