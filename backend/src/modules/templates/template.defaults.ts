// The payment reminder's body when the company hasn't written its own (see
// reminderTextOf in template.service.ts) - {{placeholders}} are
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
    "According to our records, invoice No. {{invoice_number}} dated {{invoice_date}}, " +
    "for an amount of {{amount}}, which fell due on {{due_date}}, remains unpaid to date.\n\n" +
    "We kindly ask you to settle it at your earliest convenience, " +
    "using the payment slip on page 2.\n\n" +
    "If your payment has been made in the meantime, please disregard this reminder.\n\n" +
    "Thank you for your understanding. Kind regards.";

// A new template's quote/invoice introduction: just the greeting, with the
// client's title filled in at PDF time - see pdf/templates/document.placeholders.ts.
export const DEFAULT_DOCUMENT_INTRODUCTION = "{{titre_client}},\n\n";

// Same, for the conclusion: just the company's signature (see
// pdf/templates/document.placeholders.ts).
export const DEFAULT_DOCUMENT_CONCLUSION = "{{signature_entreprise}}";

// The 2nd reminder's and the formal notice's default texts (one per level,
// see reminderTextOf) - the reminder's own amounts block lists the fees, when
// it has any (none by default: a text never announces fees that aren't there).
export const DEFAULT_SECOND_REMINDER_TEXT =
    "Malgré notre précédent rappel, la facture N° {{numero_facture}} du {{date_facture}}, " +
    "d'un montant de {{montant}}, échue le {{date_echeance}}, reste impayée à ce jour.\n\n" +
    "Nous vous prions de bien vouloir la régler dans les 10 jours, " +
    "au moyen du bulletin de versement en page 2.\n\n" +
    "Si votre paiement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce rappel.\n\n" +
    "Nous vous adressons nos meilleures salutations.";

export const DEFAULT_SECOND_REMINDER_TEXT_EN =
    "Despite our previous reminder, invoice No. {{invoice_number}} dated {{invoice_date}}, " +
    "for an amount of {{amount}}, which fell due on {{due_date}}, remains unpaid to date.\n\n" +
    "We ask you to settle it within 10 days, " +
    "using the payment slip on page 2.\n\n" +
    "If your payment has been made in the meantime, please disregard this reminder.\n\n" +
    "Kind regards.";

export const DEFAULT_FORMAL_NOTICE_TEXT =
    "Malgré nos rappels, la facture N° {{numero_facture}} du {{date_facture}}, " +
    "d'un montant de {{montant}}, échue le {{date_echeance}}, n'a toujours pas été réglée, " +
    "{{jours_retard}} jours après son échéance.\n\n" +
    "Par la présente, nous vous mettons en demeure de nous verser le montant dû " +
    "dans un délai de 10 jours, au moyen du bulletin de versement en page 2.\n\n" +
    "Passé ce délai, nous nous verrons contraints d'engager une procédure de recouvrement, " +
    "sans autre avis de notre part et à vos frais.\n\n" +
    "Veuillez agréer nos salutations distinguées.";

export const DEFAULT_FORMAL_NOTICE_TEXT_EN =
    "Despite our reminders, invoice No. {{invoice_number}} dated {{invoice_date}}, " +
    "for an amount of {{amount}}, which fell due on {{due_date}}, is still unpaid, " +
    "{{days_overdue}} days after its due date.\n\n" +
    "We hereby give you formal notice to pay the amount due " +
    "within 10 days, using the payment slip on page 2.\n\n" +
    "Should this deadline pass, we will have to start debt collection proceedings, " +
    "without further notice and at your expense.\n\n" +
    "Yours faithfully.";
