export type StatusView = { state: 'success' | 'attention' | 'pending' | 'error' | 'unknown'; labelKey: string };
export function documentProcessingView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'IMPORTED': case 'PARSED': case 'PROMOTED': case 'CREATED': return { state: 'success', labelKey: 'status.documentImported' };
    case 'RECEIVED': case 'PROCESSING': return { state: 'pending', labelKey: 'status.documentParsed' };
    case 'FAILED': return { state: 'error', labelKey: 'status.documentFailed' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}
