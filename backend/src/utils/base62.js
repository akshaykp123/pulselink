const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length);

// 62^6 total combinations for a 6-character slug (56,800,235,584)
const MAX_6_CHAR_COMBINATIONS = 62n ** 6n;

// Coprime multiplier and offset for linear congruential permutation.
// Because gcd(PERMUTATION_PRIME, MAX_6_CHAR_COMBINATIONS) === 1, this produces
// a 1-to-1 bijection with zero collisions across the entire 6-character space.
const PERMUTATION_PRIME = 38472910483n;
const PERMUTATION_OFFSET = 19283746517n;

/**
 * Scrambles an auto-incrementing ID into a non-sequential integer
 * within [0, 62^6 - 1] to prevent predictable sequential URLs.
 */
export function scrambleId(id) {
  const n = BigInt(id);
  return ((n * PERMUTATION_PRIME) + PERMUTATION_OFFSET) % MAX_6_CHAR_COMBINATIONS;
}

/**
 * Encodes a numeric ID into a scrambled, 6-character Base62 string.
 */
export function encodeBase62(num) {
  let n = scrambleId(num);
  if (n === 0n) return "000000";

  let result = "";
  while (n > 0n) {
    const remainder = Number(n % BASE);
    result = ALPHABET[remainder] + result;
    n = n / BASE;
  }

  // Pad with leading zeros to maintain fixed 6-character length
  return result.padStart(6, "0");
}

/**
 * Decodes a Base62 string back to its BigInt representation.
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
