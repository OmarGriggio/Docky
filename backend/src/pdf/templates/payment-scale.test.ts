import { describe, expect, it } from "vitest";
import { buildPaymentScale, daysUntilDue } from "./payment-scale";
import { PDF_LABELS } from "./pdf-labels";

const FR = PDF_LABELS.FR;

describe("daysUntilDue", () => {
    it("counts whole days from the date to the due date", () => {
        expect(daysUntilDue(new Date(2026, 9, 6), new Date(2026, 10, 5))).toBe(30);
        expect(daysUntilDue(new Date(2026, 2, 20), new Date(2026, 3, 19))).toBe(30);
    });

    it("is null without a due date", () => {
        expect(daysUntilDue(new Date(2026, 9, 6), null)).toBeNull();
    });
});

describe("buildPaymentScale", () => {
    it("is empty without an early payment discount", () => {
        expect(buildPaymentScale({ rate: 0, days: null, minAmount: 0 }, 30, false, FR)).toEqual([]);
        expect(buildPaymentScale({ rate: 2, days: null, minAmount: 0 }, 30, false, FR)).toEqual([]);
    });

    it("gives the discount within its days, then net within the due date's", () => {
        expect(buildPaymentScale({ rate: 2, days: 10, minAmount: 0 }, 30, true, FR)).toEqual([
            { label: "10 jours", value: "-2.00%", highlight: "early" },
            { label: "30 jours", value: "Net", highlight: "net" },
        ]);
    });

    it("starts with the minimum the discount applies from", () => {
        expect(buildPaymentScale({ rate: 2, days: 10, minAmount: 1001 }, 30, true, FR)).toEqual([
            { label: "Moins de CHF 1'001.00 TVA incl.", value: "Net", highlight: null },
            { label: "Dès CHF 1'001.00 TVA incl.", value: "", highlight: null },
            { label: "10 jours", value: "-2.00%", highlight: "early" },
            { label: "30 jours", value: "Net", highlight: "net" },
        ]);
    });

    // A 450.00 invoice under a 1'001.00 minimum: the client must not be led
    // to take a discount it doesn't get.
    it("highlights only the net line when the invoice is under the minimum", () => {
        expect(buildPaymentScale({ rate: 2, days: 10, minAmount: 1001 }, 30, false, FR)).toEqual([
            { label: "Moins de CHF 1'001.00 TVA incl.", value: "Net", highlight: "net" },
            { label: "Dès CHF 1'001.00 TVA incl.", value: "", highlight: null },
            { label: "10 jours", value: "-2.00%", highlight: null },
            { label: "30 jours", value: "Net", highlight: null },
        ]);
    });

    it("leaves out a due date no later than the discount's days", () => {
        expect(buildPaymentScale({ rate: 2, days: 10, minAmount: 0 }, 10, true, FR)).toEqual([
            { label: "10 jours", value: "-2.00%", highlight: "early" },
        ]);
        expect(buildPaymentScale({ rate: 2, days: 10, minAmount: 0 }, null, true, FR)).toHaveLength(1);
    });
});
