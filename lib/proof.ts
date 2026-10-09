/** Payment-proof rules, shared by the browser form and the server. */
export const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB

export const PROOF_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export const PROOF_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

/** Some phones report JPEGs as image/jpg or leave type empty — map by extension. */
export function guessProofMime(name: string, type: string): string | null {
  if (PROOF_TYPES[type]) return type;
  if (type === 'image/jpg') return 'image/jpeg';
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return null;
}

/** Real file type from the first bytes — does not trust the browser's label. */
export function sniffProofMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d)
    return 'application/pdf'; // %PDF-
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return 'image/png';
  return null;
}
