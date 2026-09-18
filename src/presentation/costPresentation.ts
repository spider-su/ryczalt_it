import { ApiError } from '../api/client';
import { CandidateDto, DocumentMutationDto, RequiredInputDto } from '../api/dto/accounting';

export type CostReviewState = 'supported' | 'unsupported' | 'requires_input' | 'duplicate';
export type CostOption = { value: string; label: string; recommended: boolean };
export type CostReview = {
  state: CostReviewState;
  candidate: CandidateDto;
  supplier: string;
  documentNumber: string | null;
  amount: string | null;
  currency: string | null;
  issueDate: string | null;
  requiresVatDecision: boolean;
  options: CostOption[];
  requiredInputs: RequiredInputDto[];
};

const PURCHASE_TYPES = new Set(['PURCHASE_INVOICE', 'RECEIPT']);

function mapRequiredInputs(candidate: CandidateDto): RequiredInputDto[] {
  if (candidate.requiredInputs?.length) return candidate.requiredInputs;
  if (!candidate.vatTreatmentOptions?.length) return [];
  return [{ field: 'vatTreatment', inputType: 'choice', label: '', required: true, options: candidate.vatTreatmentOptions, dependsOn: null, dependsOnValues: [] }];
}

function mapOptions(inputs: RequiredInputDto[]): CostOption[] {
  const treatment = inputs.find((input) => input.field === 'vatTreatment');
  return (treatment?.options ?? []).map((option) => ({
    value: option.value,
    label: option.label || option.value,
    recommended: option.recommended
  }));
}

export function isRequiredInputActive(input: RequiredInputDto, values: Record<string, string | null>): boolean {
  return !input.dependsOn || input.dependsOnValues.includes(values[input.dependsOn] ?? '');
}

export function missingRequiredInput(inputs: RequiredInputDto[], values: Record<string, string | null>): RequiredInputDto | null {
  return inputs.find((input) => isRequiredInputActive(input, values) && (input.required || Boolean(input.dependsOn)) && !values[input.field]?.trim()) ?? null;
}

export function mapRecognizedCost(candidate: CandidateDto): CostReview {
  const supported = PURCHASE_TYPES.has(candidate.documentType?.toUpperCase() ?? '');
  const requiredInputs = mapRequiredInputs(candidate);
  const options = mapOptions(requiredInputs);
  const requiresInput = supported && Boolean(missingRequiredInput(requiredInputs, { vatTreatment: candidate.vatTreatment ?? null }));
  return {
    state: candidate.duplicate ? 'duplicate' : !supported ? 'unsupported' : requiresInput ? 'requires_input' : 'supported',
    candidate,
    supplier: candidate.seller || candidate.buyer || '',
    documentNumber: candidate.reference,
    amount: candidate.grossAmount == null ? null : String(candidate.grossAmount),
    currency: candidate.currency,
    issueDate: candidate.issueDate,
    requiresVatDecision: requiresInput,
    options,
    requiredInputs
  };
}

export type CostMutationResult = { state: 'success' | 'duplicate' | 'unknown'; existingDocumentId: number | null };

export function mapCostMutation(result: DocumentMutationDto): CostMutationResult {
  if (result.duplicate === true || result.status.toUpperCase() === 'DUPLICATE') {
    return { state: 'duplicate', existingDocumentId: result.existingDocumentId ?? result.documentId };
  }
  if (result.status.toUpperCase() === 'STAGED' || result.status.toUpperCase() === 'CREATED') return { state: 'success', existingDocumentId: null };
  return { state: 'unknown', existingDocumentId: null };
}

export type CostErrorState = 'validation_required' | 'authentication_required' | 'unavailable' | 'backend_required' | 'unknown_error';

export function mapCostError(error: unknown): CostErrorState {
  if (error instanceof ApiError) {
    if (error.kind === 'authentication') return 'authentication_required';
    if (error.kind === 'unavailable') return 'unavailable';
    if (error.status === 400 || error.status === 422) return 'validation_required';
  }
  return 'unknown_error';
}
