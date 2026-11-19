// An employee who may not see prices (employee permissions, "Voir les prix"
// off) still edits a chantier's ledger - the prices just never come from
// them: they don't have them, everything they're answered has them taken out
// (permission.middleware.ts's hidePricesFromEmployees). Pure, tested on its
// own (hidden-prices.test.ts).

export interface LinePrice {
    unit_price: number;
    discount: number;
}

/**
 * The price a line saved by such an employee gets: the one it already had
 * (the line's id before the save, among the document's own lines), else its
 * catalog resource's selling price, else 0 - an admin prices it afterwards.
 */
export const keptLinePrice = (
    line: { id?: unknown; resource_id?: number | null },
    previous: Map<number, LinePrice>,
    catalogPrices: Map<number, number>,
): LinePrice => {
    const kept = typeof line.id === "number" ? previous.get(line.id) : undefined;
    if (kept) {
        return kept;
    }
    const catalogPrice = line.resource_id != null ? catalogPrices.get(line.resource_id) : undefined;
    return { unit_price: catalogPrice ?? 0, discount: 0 };
};
