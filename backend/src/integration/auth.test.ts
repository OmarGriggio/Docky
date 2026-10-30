import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCompany, createUser, login, PASSWORD } from "./helpers";

describe("authentication", () => {
  let companyId: number;
  let adminEmail: string;

  beforeAll(async () => {
    companyId = await createCompany();
    adminEmail = await createUser(companyId, "ADMIN");
  });

  it("logs in with the right password: an access token in the body, the refresh token only as an httpOnly cookie", async () => {
    const res = await api().post("/auth/login").send({ email: adminEmail, passwordHash: PASSWORD }).expect(200);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    const cookie = [res.headers["set-cookie"]].flat().find(c => c?.startsWith("docky_refresh_token="));
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("answers a wrong password and an unknown email the same way", async () => {
    const wrongPassword = await api().post("/auth/login").send({ email: adminEmail, passwordHash: "not-the-password" }).expect(401);
    const unknownEmail = await api().post("/auth/login").send({ email: "nobody@test.docky.ch", passwordHash: PASSWORD }).expect(401);

    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  // Two logins within the same second used to sign the very same refresh
  // token, and the second one hit refresh_tokens' unique hash: a 500.
  it("logs the same account in twice at the same moment", async () => {
    const [first, second] = await Promise.all([
      api().post("/auth/login").send({ email: adminEmail, passwordHash: PASSWORD }),
      api().post("/auth/login").send({ email: adminEmail, passwordHash: PASSWORD }),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);
  });

  it("refuses a deactivated account", async () => {
    const inactiveEmail = await createUser(companyId, "USER", false);

    await api().post("/auth/login").send({ email: inactiveEmail, passwordHash: PASSWORD }).expect(401);
  });

  it("refuses a business route without a token, or with a forged one", async () => {
    await api().get("/client").expect(401);
    await api().get("/client").set(auth("not.a.token")).expect(401);
  });

  it("gives a new access token for the refresh cookie, and nothing without it", async () => {
    const loginRes = await api().post("/auth/login").send({ email: adminEmail, passwordHash: PASSWORD }).expect(200);
    const cookies = [loginRes.headers["set-cookie"]].flat().filter((c): c is string => !!c);

    const refreshRes = await api().post("/auth/refresh").set("Cookie", cookies).expect(200);
    expect(refreshRes.body.token).toEqual(expect.any(String));

    await api().post("/auth/refresh").expect(401);
  });

  it("keeps platform-admin routes from a company admin", async () => {
    const token = await login(adminEmail);

    await api().get("/user").set(auth(token)).expect(403);
    await api().get("/login-history").set(auth(token)).expect(403);
    await api().get("/error-log").set(auth(token)).expect(403);
  });
});
