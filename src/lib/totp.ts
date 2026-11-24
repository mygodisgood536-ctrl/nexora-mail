import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { decryptSecret } from "./crypto";

const ISSUER = "Nexora Mail";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function buildTotp(secret: string, username: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function verifyTotp(
  encryptedSecret: string,
  token: string,
  username: string
): boolean {
  const secret = decryptSecret(encryptedSecret);
  const totp = buildTotp(secret, username);
  const delta = totp.validate({ token: token.trim(), window: 1 });
  return delta !== null;
}

export async function buildProvisioningUri(
  encryptedSecret: string,
  username: string
): Promise<string> {
  const secret = decryptSecret(encryptedSecret);
  return buildTotp(secret, username).toString();
}

export async function buildQrDataUri(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 224,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1714", light: "#f7f3ec" },
  });
}

export function manualKey(encryptedSecret: string): string {
  return decryptSecret(encryptedSecret);
}
