import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCompanyWithAdmin } from "./helpers";

// The company's two document colors: "#rrggbb" stored lowercase, an empty
// one as null, anything else a 400 - a number included, which used to throw
// a TypeError, answered as a 500 and recorded as a server error.
describe("the company's document colors", () => {
  let companyId: number;
  let token: string;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
  });

  const update = (colors: Record<string, unknown>) =>
    api().put(`/company/${companyId}`).set(auth(token)).send({ name: "Colors Sàrl", vat_rate: 8.1, ...colors });

  it("stores a color lowercase and an empty one as null", async () => {
    const res = await update({ accent_color: "#B8860B", secondary_color: "" }).expect(200);
    expect(res.body.accent_color).toBe("#b8860b");
    expect(res.body.secondary_color).toBeNull();
  });

  it("refuses anything that isn't #rrggbb with a 400", async () => {
    await update({ accent_color: "#fff" }).expect(400);
    await update({ secondary_color: "red" }).expect(400);
    await update({ accent_color: 5 }).expect(400);
    await update({ secondary_color: ["#b8860b"] }).expect(400);
  });
});
