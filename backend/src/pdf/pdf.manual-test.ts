import { writeFile } from "fs/promises";
import { PdfDocument } from "./PdfDocument";
import { FacturePdf } from "./templates/FacturePdf";
import { FactureDto } from "./PdfTypes";

const data: FactureDto = {
    numero: "F-2026-0012",
    date: new Date(),
    client: {
        nom: "Entreprise Dupont Sarl",
        adresse: "Rue du Lac 12, 1800 Vevey",
    },
    lignes: [
        { libelle: "Ciment", quantite: 20, unite: "sac", prixUnitaire: 8.5 },
        { libelle: "Pose carrelage", quantite: 15, unite: "h", prixUnitaire: 65 },
    ],
    montantHt: 1145,
    montantTtc: 1234.15,
};

const main = async () => {
    const pdf = await PdfDocument.create();
    FacturePdf.render(pdf, data);
    const bytes = await pdf.save();

    await writeFile("facture-test.pdf", bytes);
    console.log("facture-test.pdf written");
};

main();
