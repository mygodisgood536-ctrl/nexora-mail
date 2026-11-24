import * as OTPAuth from "otpauth";

const BASE = process.env.E2E_BASE || "http://localhost:3000";
let cookie = "";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " :: " + detail : ""}`);
}

async function call(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const share = process.env.E2E_SHARE ? `_vercel_share=${process.env.E2E_SHARE}` : "";
  if (share || cookie) headers.Cookie = [share, cookie].filter(Boolean).join("; ");
  const res = await fetch(BASE + path, { ...options, headers, redirect: "manual" });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let body = {};
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

function totp(secret) {
  return new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).generate();
}

const suffix = Date.now().toString().slice(-7);
const username = `probe${suffix}`;
const password = "ProbePass1234";
const fullName = "Probe Tester";

let r = await call("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ fullName, username, password }),
});
check("register returns 201", r.status === 201, JSON.stringify(r.body).slice(0, 160));
const enrollmentToken = r.body.enrollmentToken;
const recoveryCodes = r.body.recoveryCodes || [];
check("enrollment token issued", typeof enrollmentToken === "string" && enrollmentToken.length > 10);
check("10 recovery codes issued", recoveryCodes.length === 10);

r = await call("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ fullName, username, password }),
});
check("duplicate username rejected", r.status === 409, String(r.status));

r = await call("/api/auth/enrollment?token=" + encodeURIComponent(enrollmentToken));
check("enrollment details load", r.status === 200 && !!r.body.qrDataUri, String(r.status));
const manualKey = r.body.manualKey;
check("manual key present", typeof manualKey === "string" && manualKey.length >= 16);

r = await call("/api/auth/enrollment/verify", {
  method: "POST",
  body: JSON.stringify({ token: enrollmentToken, code: "000000" }),
});
check("wrong enrollment code rejected", r.status === 400, String(r.status));

r = await call("/api/auth/enrollment/verify", {
  method: "POST",
  body: JSON.stringify({ token: enrollmentToken, code: totp(manualKey) }),
});
check("correct enrollment code accepted", r.status === 200, JSON.stringify(r.body));

r = await call("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password: "wrongpass123" }),
});
check("wrong password rejected", r.status === 401, String(r.status));

r = await call("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password }),
});
check("login stage 1 returns 2FA challenge", r.status === 200 && r.body.requiresTwoFactor === true, JSON.stringify(r.body).slice(0, 120));
const challengeToken = r.body.challengeToken;

r = await call("/api/messages");
check("protected API blocked before 2FA", r.status === 401, String(r.status));

r = await call("/api/auth/login/verify", {
  method: "POST",
  body: JSON.stringify({ challengeToken, code: "000000" }),
});
check("wrong 2FA code rejected", r.status === 400, String(r.status));

r = await call("/api/auth/login/verify", {
  method: "POST",
  body: JSON.stringify({ challengeToken, code: totp(manualKey) }),
});
check("correct 2FA code grants session", r.status === 200 && Boolean(cookie), JSON.stringify(r.body));

r = await call("/api/auth/me");
check("authenticated account loads", r.status === 200 && r.body.user?.username === username, JSON.stringify(r.body).slice(0, 160));

r = await call("/api/messages");
check("protected API accessible with session", r.status === 200, String(r.status));
r = await call("/mailbox");
check("protected page accessible with session", r.status === 200, String(r.status));

r = await call("/api/auth/logout", { method: "POST" });
check("logout succeeds", r.status === 200, String(r.status));
r = await call("/api/messages");
check("session invalid after logout", r.status === 401, String(r.status));
r = await call("/mailbox");
check("protected page redirects after logout", r.status === 307, String(r.status));

r = await call("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password }),
});
const relogin = r.body.challengeToken;
r = await call("/api/auth/login/verify", {
  method: "POST",
  body: JSON.stringify({ challengeToken: relogin, code: totp(manualKey) }),
});
check("re-login after logout works", r.status === 200, String(r.status));

r = await call("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ fullName, username: "x", password: "short" }),
});
check("invalid registration fields rejected", r.status === 400, String(r.status));

r = await call("/api/auth/change-password", {
  method: "POST",
  body: "{}",
});
const changeToken = r.body.challengeToken;
check("change-password challenge issued", r.status === 200 && !!changeToken, String(r.status));

r = await call("/api/auth/change-password", {
  method: "POST",
  body: JSON.stringify({ token: changeToken, code: totp(manualKey), newPassword: "NewProbe1234" }),
});
check("password changed with TOTP", r.status === 200, JSON.stringify(r.body).slice(0, 120));

r = await call("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password: "NewProbe1234" }),
});
check("new password works", r.status === 200 && r.body.requiresTwoFactor === true, String(r.status));

const resetStart = await call("/api/auth/forgot-password", {
  method: "POST",
  body: JSON.stringify({ username }),
});
check("forgot-password challenge issued", resetStart.status === 200 && !!resetStart.body.challengeToken, String(resetStart.status));
r = await call("/api/auth/forgot-password/verify", {
  method: "POST",
  body: JSON.stringify({ challengeToken: resetStart.body.challengeToken, code: "000000" }),
});
check("wrong reset code rejected", r.status === 400, String(r.status));
r = await call("/api/auth/forgot-password/verify", {
  method: "POST",
  body: JSON.stringify({ challengeToken: resetStart.body.challengeToken, code: totp(manualKey) }),
});
check("correct reset code accepted", r.status === 200 && !!r.body.resetToken, String(r.status));
r = await call("/api/auth/forgot-password/reset", {
  method: "POST",
  body: JSON.stringify({ resetToken: r.body.resetToken, newPassword: "FinalProbe123" }),
});
check("password reset completed", r.status === 200, String(r.status));

r = await call("/api/auth/recovery", {
  method: "POST",
  body: JSON.stringify({ username, code: "INVALID-CODE" }),
});
check("invalid recovery code rejected", r.status === 400, String(r.status));
r = await call("/api/auth/recovery", {
  method: "POST",
  body: JSON.stringify({ username, code: recoveryCodes[0] }),
});
check("valid recovery code starts re-enrollment", r.status === 200 && !!r.body.enrollmentToken, String(r.status));

const failed = results.filter((x) => !x.ok);
console.log(`\nTOTAL=${results.length} PASSED=${results.length - failed.length} FAILED=${failed.length}`);
process.exit(failed.length ? 1 : 0);
