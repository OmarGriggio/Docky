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
