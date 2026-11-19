import { describe, expect, it } from "vitest";
import { keptLinePrice } from "./hidden-prices";

describe("keptLinePrice", () => {
    const previous = new Map([[7, { unit_price: 42.5, discount: 10 }]]);
    const catalog = new Map([[3, 18.5]]);

    it("keeps the price a line already had", () => {
        expect(keptLinePrice({ id: 7, resource_id: 3 }, previous, catalog)).toEqual({ unit_price: 42.5, discount: 10 });
    });

    it("prices a new catalog line at its resource's selling price", () => {
        expect(keptLinePrice({ resource_id: 3 }, previous, catalog)).toEqual({ unit_price: 18.5, discount: 0 });
        // An id that isn't one of the document's own lines counts as new.
        expect(keptLinePrice({ id: 99, resource_id: 3 }, previous, catalog)).toEqual({ unit_price: 18.5, discount: 0 });
    });

    it("leaves a line typed by hand at 0, for an admin to price", () => {
        expect(keptLinePrice({ resource_id: null }, previous, catalog)).toEqual({ unit_price: 0, discount: 0 });
        expect(keptLinePrice({ id: "7", resource_id: null }, previous, catalog)).toEqual({ unit_price: 0, discount: 0 });
    });
});
