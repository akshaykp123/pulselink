// The 62 URL-safe characters: 0-9 (10) + a-z (26) + A-Z (26) = 62 characters
// Why Base62 instead of Base64: Base64 includes '+' and '/' which break URLs. Base62 is 100% safe for clean slugs without URL encoding
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Why BigInt: Standard JS Numbers lose precision above 2^53 - 1. PostgreSQL 64-bit BIGSERIAL goes up to 2^63 - 1. BigInt prevents rounding bugs
const BASE = BigInt(ALPHABET.length); // Base 62

// Converts a database 64-bit numeric ID into a compact Base62 short code (e.g. 125 -> "21")
// Capacity: 6 characters yield 62^6 (~56.8 billion URLs), 7 characters yield 62^7 (~3.52 trillion URLs)
export function encodeBase62(num) {
  let n = BigInt(num);
  if (n === 0n) return "0";

  let result = "";
  // Repeatedly divide by 62 and prepend the corresponding character
  while (n > 0n) {
    const remainder = Number(n % BASE);
    result = ALPHABET[remainder] + result;
    n = n / BASE;
  }

  // Return the compact short code directly
  return result;
}

// Converts a Base62 short code back into the original database integer ID
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