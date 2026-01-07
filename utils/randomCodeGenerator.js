/**
 * Generate random alphanumeric code (A-Z, 0-9)
 * @param {number} length - panjang kode (default 6)
 * @param {string} prefix - prefix opsional (contoh: "PRODDUK", "SALE", "INV")
 * @returns {string} - hasil kode acak, contoh: PROD-3G8KZT
 */
function generateCode(length = 6, prefix = '') {
  const code = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  return prefix ? `${prefix}-${code}` : code;
}

module.exports = { generateCode };