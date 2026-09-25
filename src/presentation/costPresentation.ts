import { ApiError } from '../api/client';
import type { InvoiceCandidateDto, InvoiceCreateDto, InvoiceResultDto, RequiredInputDto } from '../api/dto/accounting';

export type CostReviewState = 'supported' | 'unsupported' | 'requires_input' | 'duplicate';
export type CostOption = { value: string; label: string; recommended: boolean };
export type CostReview = { state: CostReviewState; candidate: InvoiceCandidateDto; supplier: string; documentNumber: string | null; amount: string | null; currency: string | null; issueDate: string | null; requiresVatDecision: boolean; options: CostOption[]; requiredInputs: RequiredInputDto[] };
export type ManualCostDraft = { counterparty: string; taxIdentifier: string; reference: string; issueDate: string; dueDate: string; currency: string; netAmount: string; vatAmount: string; grossAmount: string };
export type ManualCostDraftError = 'counterparty' | 'reference' | 'issueDate' | 'dueDate' | 'currency' | 'netAmount' | 'vatAmount' | 'grossAmount';
const PURCHASE_TYPES = new Set(['PURCHASE_INVOICE', 'RECEIPT', 'PURCHASE']);

export function normalizeManualDecimal(value: string): string | null {
  const input = value.trim();
  if (input.includes('.') && input.includes(',')) return null;
  const canonical = input.replace(',', '.');
  const match = canonical.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const integer = match[2]!.replace(/^0+(?=\d)/, '');
  const fraction = match[3];
  return `${match[1]}${integer}${fraction ? `.${fraction}` : ''}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateManualCostDraft(draft: ManualCostDraft): ManualCostDraftError | null {
  if (!draft.counterparty.trim()) return 'counterparty';
  if (!draft.reference.trim()) return 'reference';
  if (!isValidDate(draft.issueDate.trim())) return 'issueDate';
  if (draft.dueDate.trim() && !isValidDate(draft.dueDate.trim())) return 'dueDate';
  if (!/^[A-Za-z]{3}$/.test(draft.currency.trim())) return 'currency';
  if (normalizeManualDecimal(draft.netAmount) == null) return 'netAmount';
  if (normalizeManualDecimal(draft.vatAmount) == null) return 'vatAmount';
  if (normalizeManualDecimal(draft.grossAmount) == null) return 'grossAmount';
  return null;
}

function mapOptions(inputs: RequiredInputDto[]): CostOption[] { return (inputs.find((input) => input.field.toUpperCase() === 'CLASSIFICATION')?.options ?? inputs.find((input) => input.field.toUpperCase() === 'VAT_TREATMENT')?.options ?? []).map((option) => ({ value: option.value, label: option.labelKey || option.value, recommended: false })); }
export function isRequiredInputActive(input: RequiredInputDto, values: Record<string, string | null>): boolean { return !input.dependsOn || input.dependsOnValues.includes(values[input.dependsOn] ?? ''); }
export function missingRequiredInput(inputs: RequiredInputDto[], values: Record<string, string | null>): RequiredInputDto | null { return inputs.find((input) => isRequiredInputActive(input, values) && input.required && !values[input.field]?.trim()) ?? null; }
export function mapRecognizedCost(candidate: InvoiceCandidateDto): CostReview {
  const requiredInputs = candidate.requiredInputs ?? [];
  const requiresInput = candidate.direction.toUpperCase() === 'COST' && Boolean(missingRequiredInput(requiredInputs, { classification: candidate.classification, vatTreatment: candidate.vatTreatment, ryczaltRate: candidate.ryczaltRate }));
  return { state: candidate.duplicate ? 'duplicate' : candidate.direction.toUpperCase() !== 'COST' ? 'unsupported' : requiresInput ? 'requires_input' : 'supported', candidate, supplier: '', documentNumber: candidate.reference, amount: candidate.grossAmount, currency: candidate.currency, issueDate: candidate.issueDate, requiresVatDecision: requiresInput, options: mapOptions(requiredInputs), requiredInputs };
}
export function invoiceFromCandidate(candidate: InvoiceCandidateDto, values: Record<string, string | null>): InvoiceCreateDto {
  return { candidateKey: candidate.candidateKey, counterpartyId: candidate.counterpartyId, classification: values.classification || candidate.classification, vatTreatment: candidate.vatTreatment, ryczaltRate: candidate.ryczaltRate, paymentVerificationPolicy: values.paymentVerificationPolicy || candidate.paymentVerificationPolicy, approve: true, rememberRule: false };
}
export type CostMutationResult = { state: 'success' | 'duplicate' | 'unknown'; existingInvoiceId: string | null };
export function mapCostMutation(result: InvoiceResultDto): CostMutationResult { return result.id != null ? { state: 'success', existingInvoiceId: null } : { state: 'unknown', existingInvoiceId: null }; }
export type CostErrorState = 'validation_required' | 'authentication_required' | 'authorization_failed' | 'unavailable' | 'backend_required' | 'unknown_error';
export function mapCostError(error: unknown): CostErrorState { if (error instanceof ApiError) { if (error.kind === 'authentication') return 'authentication_required'; if (error.kind === 'authorization') return 'authorization_failed'; if (error.kind === 'unavailable') return 'unavailable'; if (error.kind === 'validation' || error.status === 400 || error.status === 422) return 'validation_required'; } return 'unknown_error'; }
