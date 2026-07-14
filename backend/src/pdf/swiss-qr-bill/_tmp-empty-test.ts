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
    debtor: null,
    payment: {
        amount: null,
        currency: "CHF",
        additionalInfo: "",
    },
};

const main = async () => {
    const qrImageBytes = await generateSwissQrBillImage(data);
    const pdf = await PdfWriter.create({ pageSize: SwissQrBillTemplate.compactPageSize() });
    await SwissQrBillTemplate.render(pdf, data, qrImageBytes);
    const bytes = await pdf.save();
    await writeFile("qr-bill-empty-test.pdf", bytes);
    console.log("qr-bill-empty-test.pdf written");
};

main();
