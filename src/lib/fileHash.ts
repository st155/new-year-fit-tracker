/**
 * Calculates SHA-256 hash of a file for duplicate detection
 * @param file - File to hash
 * @returns Hex string representation of SHA-256 hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
