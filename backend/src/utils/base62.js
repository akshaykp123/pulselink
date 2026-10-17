// The 62 URL-safe characters: 0-9, a-z, and A-Z
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length); // Base 62

// Converts a database numeric ID into a compact Base62 short code (e.g. 125 -> "21")
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