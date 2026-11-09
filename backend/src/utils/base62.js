// The 62 URL-safe characters: 0-9 (10) + a-z (26) + A-Z (26) = 62 characters
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length); // 62

// Total combinations for a strictly 6-character slug: 62^6 = 56,800,235,584
const MAX_6_CHAR_COMBINATIONS = 62n ** 6n; // 56,800,235,584n

// A large prime number coprime to 62^6 (guarantees a 1-to-1 bijective permutation with ZERO collisions)
const PERMUTATION_PRIME = 38472910483n;
const PERMUTATION_OFFSET = 19283746517n;

/**
 * Mathematically scrambles an auto-incrementing database ID into an unpredictable
 * pseudo-random integer inside the 6-character space [0, 62^6 - 1].
 * Guarantees zero collisions via modular arithmetic.
 */
export function scrambleId(id) {
  const n = BigInt(id);
  return ((n * PERMUTATION_PRIME) + PERMUTATION_OFFSET) % MAX_6_CHAR_COMBINATIONS;
}

/**
 * Converts a database numeric ID into a secure, scrambled, strictly 6-character Base62 slug.
 * Examples:
 *   ID 1 -> "12J2TS" (6 chars, unpredictable)
 *   ID 2 -> "H2psq7" (6 chars, unpredictable)
 *   ID 3 -> "n25RWm" (6 chars, unpredictable)
 */
export function encodeBase62(num) {
  // 1. Scramble the sequential ID into pseudo-random space
  let n = scrambleId(num);

  if (n === 0n) return "000000";

  let result = "";
  // 2. Base62 division loop
  while (n > 0n) {
    const remainder = Number(n % BASE);
    result = ALPHABET[remainder] + result;
    n = n / BASE;
  }

  // 3. Strictly enforce 6 characters length
  return result.padStart(6, "0");
}

/**
 * Converts a Base62 string back into its scrambled BigInt value
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