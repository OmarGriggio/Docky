import { describe, expect, it } from "vitest";
import { splitPostalCodeCity } from "./postal-code-city";

describe("splitPostalCodeCity", () => {
  it("splits an NPA and its town", () => {
    expect(splitPostalCodeCity(" 1950 Sion ")).toEqual({ postalCode: "1950", city: "Sion" });
    expect(splitPostalCodeCity("1009 Pully VD")).toEqual({ postalCode: "1009", city: "Pully VD" });
  });

  it("reads a number alone as an NPA, anything else as the town", () => {
    expect(splitPostalCodeCity("1950")).toEqual({ postalCode: "1950", city: "" });
    expect(splitPostalCodeCity("Sion")).toEqual({ postalCode: "", city: "Sion" });
    expect(splitPostalCodeCity("")).toEqual({ postalCode: "", city: "" });
  });
});
