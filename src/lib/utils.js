/**
 * Generador de hashes cortos para folios públicos
 * Alfanumérico base36 (0-9, A-Z)
 */
export function generateFolioHash(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Formato: ABCD-1234
  return `${result.substring(0, 4)}-${result.substring(4, 8)}`;
}
