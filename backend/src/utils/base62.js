// The 62 URL-safe alphanumeric characters (0-9, a-z, A-Z)
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length); // 62n

/**
 * Encodes a numeric database ID into an ultra-compact Base62 string without artificial padding
 * @param {number|string|bigint} num - The database primary key ID
 * @returns {string} Compact short code (e.g. "2", "1iE", "xK9w2Z")
 */
export function encodeBase62(num) {
  let n = BigInt(num);
  if (n === 0n) return "0";

  let result = "";
  while (n > 0n) {
    const remainder = Number(n % BASE);
    result = ALPHABET[remainder] + result;
    n = n / BASE;
  }

  // Returns the compact slug directly without useless leading zeros
  return result;
}

/**
 * Decodes a Base62 string back into its original database ID
 * @param {string} str - The Base62 short code
 * @returns {bigint} Original database numeric ID
 */
export function decodeBase62(str) {
  let result = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    result = result * BASE + BigInt(index);
  }
  return result;
}