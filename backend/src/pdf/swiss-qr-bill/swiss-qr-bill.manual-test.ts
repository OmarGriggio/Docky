import { writeFile } from "fs/promises";
import { PdfWriter } from "../core/pdf-writer";
import { SwissQrBillTemplate } from "../templates/swiss-qr-bill.template";
import { generateSwissQrBillImage } from "./swiss-qr-bill.generator";
import { SwissQrBillDto } from "./swiss-qr-bill.types";

const data: SwissQrBillDto = {
    creditor: {
        name: "Entreprise Dupont Sarl",
        addressLine1: "Rue du Lac 12",
        addressLine2: "1800 Vevey",
        country: "CH",
        iban: "CH4431999123000889012",
    },
    debtor: {
        name: "Jean Rochat",
        addressLine1: "Route de la Gare 5",
        addressLine2: "1003 Lausanne",
        country: "CH",
    },
    payment: {
        amount: 1234.15,
        currency: "CHF",
        additionalInfo: "Facture F-2026-0012",
    },
};

const main = async () => {
    const qrImageBytes = await generateSwissQrBillImage(data);

    const pdf = await PdfWriter.create({ pageSize: SwissQrBillTemplate.compactPageSize() });
    await SwissQrBillTemplate.render(pdf, data, qrImageBytes);
    const bytes = await pdf.save();

    await writeFile("qr-bill-test.pdf", bytes);
    console.log("qr-bill-test.pdf written");
};

main();
