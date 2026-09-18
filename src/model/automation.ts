export type AutoApprovalSettings = {
  enabled: boolean;
  maxAmount: string;
  trustedCategories: string[];
};

export function canonicalAutoApprovalAmount(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  return /^\d+(?:\.\d+)?$/.test(normalized) ? normalized : null;
}

export function categoriesInputValue(categories: string[]): string {
  return categories.join(', ');
}

export function categoriesFromInput(value: string): string[] {
  return value.split(',').map((category) => category.trim()).filter(Boolean);
}

export function mapAutoApprovalSettings(body: unknown): AutoApprovalSettings {
  if (!body || typeof body !== 'object') throw new Error('invalid_auto_approval_response');
  const value = body as { enabled?: unknown; maxAmount?: unknown; trustedCategories?: unknown };
  if (typeof value.enabled !== 'boolean' || typeof value.maxAmount !== 'string' || canonicalAutoApprovalAmount(value.maxAmount) !== value.maxAmount.trim()) {
    throw new Error('invalid_auto_approval_response');
  }
  if (!Array.isArray(value.trustedCategories) || value.trustedCategories.some((category) => typeof category !== 'string' || !category.trim())) {
    throw new Error('invalid_auto_approval_response');
  }
  return { enabled: value.enabled, maxAmount: value.maxAmount, trustedCategories: value.trustedCategories.map((category) => category) };
}
