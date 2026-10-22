// The payment reminder's body when the company hasn't written its own (see
// document_template.service.ts's getTemplateServ) - {{placeholders}} are
// filled in when the PDF is generated, see pdf/templates/reminder.placeholders.ts
// for the full list.
export const DEFAULT_REMINDER_TEXT =
    "Sauf erreur de notre part, la facture N° {{numero_facture}} du {{date_facture}}, " +
    "d'un montant de {{montant}}, arrivée à échéance le {{date_echeance}}, n'a pas été réglée à ce jour.\n\n" +
    "Nous vous prions de bien vouloir procéder à son paiement dans les meilleurs délais, " +
    "au moyen du bulletin de versement en page 2.\n\n" +
    "Si votre paiement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce rappel.\n\n" +
    "Nous vous remercions de votre compréhension et vous adressons nos meilleures salutations.";

// Same text in English - picked by the reminder PDF for a client whose
// language is EN (see reminder-pdf-generator.ts), when the company hasn't
// written its own.
export const DEFAULT_REMINDER_TEXT_EN =
    "According to our records, invoice No. {{numero_facture}} dated {{date_facture}}, " +
    "for an amount of {{montant}}, which fell due on {{date_echeance}}, remains unpaid to date.\n\n" +
    "We kindly ask you to settle it at your earliest convenience, " +
    "using the payment slip on page 2.\n\n" +
    "If your payment has been made in the meantime, please disregard this reminder.\n\n" +
    "Thank you for your understanding. Kind regards.";

// A QUOTE/INVOICE introduction when the company has no template saved for
// that type yet (see getTemplateServ): just the greeting, with the client's
// title filled in at PDF time - see pdf/templates/document.placeholders.ts.
export const DEFAULT_DOCUMENT_INTRODUCTION = "{{titre_client}},\n\n";

// Same, for the conclusion: just the company's signature (see
// pdf/templates/document.placeholders.ts).
export const DEFAULT_DOCUMENT_CONCLUSION = "{{signature_entreprise}}";
