export const accountingPaths = {
  mobileMonth: (profileId: number, month: string) =>
    `/api/v1/profiles/${profileId}/accounting/months/${month}`,
  mobileDocuments: (profileId: number, month: string) =>
    `/api/v1/profiles/${profileId}/accounting/months/${month}/documents`,
  paymentHistory: (profileId: number) =>
    `/api/v1/profiles/${profileId}/accounting/payments/history`,
  autoApproval: (profileId: number) =>
    `/api/v1/profiles/${profileId}/accounting/auto-approval`,
  counterparties: (profileId: number) =>
    `/api/profiles/${profileId}/accounting/counterparties`,
  recognizeDocument: (profileId: number) =>
    `/api/profiles/${profileId}/accounting/documents/recognize`,
  documents: (profileId: number) => `/api/profiles/${profileId}/accounting/documents`
} as const;
