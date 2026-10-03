import request from "supertest";
import { app } from "../../src/app.js";

/**
 * Shared test authentication helper to log in a user and return their session cookie header.
 * E.g.: "toktickit_session=abc123xyz"
 */
export async function loginAs(
  email: string,
  password = "Password123!"
): Promise<{ cookie: string; token: string; user: any }> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `loginAs failed for ${email} with status ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  const token = match ? match[1] : "";

  return {
    cookie: `toktickit_session=${token}`,
    token,
    user: res.body.user,
  };
}
