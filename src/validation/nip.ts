export const NipValidator = {
  normalize(raw: string): string { return raw.replace(/[^0-9]/g, ''); },
  isValid(raw: string): boolean {
    const nip = this.normalize(raw); if (nip.length !== 10) return false;
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const checksum = weights.reduce((sum, weight, index) => sum + Number(nip[index]) * weight, 0) % 11;
    return checksum !== 10 && checksum === Number(nip[9]);
  },
};
