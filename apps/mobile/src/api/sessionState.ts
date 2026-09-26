let sessionEpoch = 0;
const activeControllers = new Set<AbortController>();

export function currentSessionEpoch(): number {
  return sessionEpoch;
}

export function rotateAccountingSession(): number {
  sessionEpoch += 1;
  for (const controller of activeControllers) controller.abort();
  activeControllers.clear();
  return sessionEpoch;
}

export function registerSessionRequest(controller: AbortController): () => void {
  activeControllers.add(controller);
  return () => activeControllers.delete(controller);
}

