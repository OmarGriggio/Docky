import { PdfWriter } from "../core/pdf-writer";
import { FactureDto } from "./facture.types";

export class FactureTemplate {

    static render(pdf: PdfWriter, data: FactureDto) {
        pdf.title(`Facture ${data.numero}`);
        pdf.text(new Date(data.date).toLocaleDateString("fr-CH"));
        pdf.line();

        pdf.text(data.client.nom, { bold: true });
        pdf.text(data.client.adresse);
        pdf.line();

        for (const ligne of data.lignes) {
            const total = ligne.quantite * ligne.prixUnitaire;
            const quantite = ligne.unite ? `${ligne.quantite} ${ligne.unite}` : `${ligne.quantite}`;
            pdf.text(`${ligne.libelle} — ${quantite} x ${ligne.prixUnitaire.toFixed(2)} = ${total.toFixed(2)} CHF`);
        }
        pdf.line();

        pdf.text(`Total HT : ${data.montantHt.toFixed(2)} CHF`, { bold: true });
        pdf.text(`Total TTC : ${data.montantTtc.toFixed(2)} CHF`, { bold: true });
    }

}
