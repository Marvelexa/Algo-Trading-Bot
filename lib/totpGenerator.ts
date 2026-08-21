/**
 * Base32 character set mapping
 */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decodes a Base32 string into a Buffer
 */
function base32Decode(base32Str: string): Buffer {
  const cleaned = base32Str.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit Time-based One-Time Password (TOTP) for Angel One 2FA authentication
 * @param secret Base32 TOTP Secret Key (from Angel One app / Google Authenticator setting)
 * @param timeStepSecs Step duration in seconds (default: 30s)
 */
export function generateTOTP(secret: string, timeStepSecs: number = 30): string {
  if (!secret) return "000000";

  const key = base32Decode(secret);
  const epochSecs = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epochSecs / timeStepSecs);

  // 8-byte big-endian counter buffer
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);

  // HMAC-SHA1 calculation
  let digest: Buffer = Buffer.from([0, 0, 0, 0]);
  try {
    const nodeCrypto = typeof window === "undefined" ? require("crypto") : null;
    if (nodeCrypto) {
      const hmac = nodeCrypto.createHmac("sha1", key);
      hmac.update(counterBuf);
      digest = hmac.digest();
    }
  } catch (e) {}

  // Dynamic truncation algorithm (RFC 4226)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}
