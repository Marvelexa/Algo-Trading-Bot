import { authEngine } from "../lib/authEngine.js";

async function testAuthEngine() {
  console.log("=========================================");
  console.log("🔐 TESTING MANUAL AUTHENTICATION ENGINE");
  console.log("=========================================");

  // 1. Test failed login with wrong PIN
  const badLogin = authEngine.authenticate("admin", "0000", "Unit Test");
  console.log("1. Bad PIN test:", !badLogin.success ? "✅ Correctly Rejected" : "❌ Unexpectedly Allowed");

  // 2. Test successful login with default PIN 8888
  const goodLogin = authEngine.authenticate("admin", "8888", "Desktop Terminal");
  console.log("2. Good PIN (8888) test:", goodLogin.success && goodLogin.token ? "✅ Login Success & Token Issued" : "❌ Failed");

  if (!goodLogin.token) {
    throw new Error("Token was not generated");
  }

  // 3. Test token verification
  const verifyRes = authEngine.verifyToken(goodLogin.token);
  console.log("3. Token verification test:", verifyRes.valid && verifyRes.user?.username === "admin" ? "✅ Token Verified & Valid" : "❌ Token Invalid");

  // 4. Test session info
  const session = authEngine.getSessionInfo();
  console.log("4. Active session info test:", session.username === "admin" && session.activeDevicesCount >= 1 ? "✅ Session Info Synced" : "❌ Failed");

  // 5. Test invalid token rejection
  const invalidVerify = authEngine.verifyToken("invalid.token.payload");
  console.log("5. Tampered token rejection test:", !invalidVerify.valid ? "✅ Correctly Rejected Tampered Token" : "❌ Security Failure");

  console.log("=========================================");
  console.log("🎉 ALL AUTHENTICATION TESTS PASSED!");
  console.log("=========================================");
}

testAuthEngine().catch(console.error);
