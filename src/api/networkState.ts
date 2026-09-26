let offline: boolean | null = null;

export function setNetworkOffline(value: boolean | null): void {
  offline = value;
}

export function isNetworkOffline(): boolean {
  return offline === true;
}
