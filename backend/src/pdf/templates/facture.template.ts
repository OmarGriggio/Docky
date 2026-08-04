import { blob } from "stream/consumers";
import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { FactureDto } from "./facture.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;

export class FactureTemplate {

    static async render(pdf: PdfWriter, facture: FactureDto, logoBytes: Buffer | null) {
        const date = new Date(facture.date).toLocaleDateString("fr-CH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const table = this.createLignesTable(facture);

        if (logoBytes) {
            await this.drawLogo(pdf, logoBytes);
        }

        pdf.title(`Facture ${facture.numero}`);

        pdf.text(facture.entreprise.nom, {bold: true});
        pdf.text(facture.entreprise.rue);
        pdf.text(facture.entreprise.npaVille, {marginBottom: 30});

        pdf.text(facture.client.nom, { bold: true, indent:250 });
        pdf.text(facture.client.rue, {indent:250});
        pdf.text(facture.client.npaVille, {indent:250, marginBottom: 15});

        pdf.text(facture.entreprise.ville + ", le " + date, {marginBottom: 10, indent:250});

        pdf.text(facture.client.civilite, {marginBottom: 5});

        //TODO :Ajouter a la table document
        pdf.text(facture.introduction);

        pdf.table(table);
        pdf.line();

        pdf.text(`Total HT : ${facture.montantHt.toFixed(2)} CHF`, { bold: true, marginTop: 15 });
        pdf.text(`Total TTC : ${facture.montantTtc.toFixed(2)} CHF`, { bold: true, marginBottom: 20 });

        pdf.text(facture.conclusion);

        pdf.text(facture.entreprise.nom, {indent: 250, marginTop: 20})
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

    private static async drawLogo(pdf: PdfWriter, logoBytes: Buffer) {
        const image = await this.embedLogo(pdf, logoBytes);
        if (!image) return;

        const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
        pdf.drawImageCentered(image, image.width * scale, image.height * scale, 15);
    }

    /** The logo file may be a JPEG or a PNG; try both embedders rather than trusting the file extension. */
    private static async embedLogo(pdf: PdfWriter, logoBytes: Buffer): Promise<PDFImage | null> {
        try {
            return await pdf.embedJpg(logoBytes);
        } catch {
            try {
                return await pdf.embedPng(logoBytes);
            } catch {
                return null;
            }
        }
    }

}
