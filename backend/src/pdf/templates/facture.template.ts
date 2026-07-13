import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { FactureDto } from "./facture.types";

export class FactureTemplate {

    static render(pdf: PdfWriter, facture: FactureDto) {
        const table = this.createLignesTable(facture);
        pdf.title(`Facture ${facture.numero}`);
        pdf.text(new Date(facture.date).toLocaleDateString("fr-CH"));
        pdf.line();

        pdf.text(facture.client.nom, { bold: true });
        pdf.text(facture.client.adresse);
        pdf.line();

        pdf.table(table);

        pdf.line();

        pdf.text(`Total HT : ${facture.montantHt.toFixed(2)} CHF`, { bold: true });
        pdf.text(`Total TTC : ${facture.montantTtc.toFixed(2)} CHF`, { bold: true });
    };

    private static createLignesTable(facture: FactureDto): PdfTable {
        return{
            columns: [
                {
                    key: "description",
                    title: "Description",
                    width: 260,
                },
                {
                    key: "quantite",
                    title: "Qté",
                    width: 60,
                },
                {
                    key: "prix",
                    title: "Prix",
                    width: 80,
                },
                {
                    key: "total",
                    title: "Total",
                    width: 80,
                },
            ],
            rows: facture.lignes.map(ligne => ({
                description: ligne.libelle,
                quantite: ligne.unite ? `${ligne.quantite} ${ligne.unite}` : `${ligne.quantite}`,
                prix: `${ligne.prixUnitaire.toFixed(2)} CHF`,
                total: `${(ligne.quantite * ligne.prixUnitaire).toFixed(2)} CHF`,
            })),
        };
    }    

}
