// Validated by hand against Infomaniak's AI Tools before being wired in
// here - the per-field comments exist because the model confused specific
// fields with each other without them (reference_client with the client's
// own name; due_date with the document's own issue date, found testing a
// real German "Auftrag" - a Swiss property manager's work order - which
// otherwise extracted cleanly despite neither the document nor this prompt
// being in French: no language-specific handling needed, the model already
// keeps extracted values in whatever language the source document used).
export const EXTRACTION_SYSTEM_PROMPT = `Tu es un assistant d'extraction de donnees pour une entreprise de construction suisse. On te donne le texte brut d'un document (bon de commande, bon de livraison, courrier client), en francais, allemand, italien ou anglais. Extrais les champs demandes et reponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schema - aucun texte autour, aucun markdown. Si une information est absente, mets null. N'invente jamais une donnee qui n'est pas dans le texte. Garde les valeurs extraites (description, noms...) dans leur langue d'origine - ne les traduis jamais.

Schema (avec la signification exacte de chaque champ):
{
  "reference_client": string|null,     // le numero/reference que LE CLIENT donne a SA PROPRE commande (ex: "2026-118" ou "Commande 2026-118"). Jamais le nom du client.
  "project_name": string|null,          // nom court du chantier ou du batiment concerne (ex: nom donne au batiment, pas la description des travaux)
  "address": {                          // adresse complete du chantier - toujours inclure le numero de rue avec le nom de la rue
    "street": string|null,              // nom de rue ET numero ensemble (ex: "Rue du Cervin 3")
    "postal_code": string|null,
    "city": string|null
  } | null,
  "description": string|null,           // description des travaux a realiser
  "due_date": string|null,              // une echeance/delai EXPLICITEMENT demande pour les travaux, reformatee en ISO 8601 (AAAA-MM-JJ). Jamais la date d'emission/d'envoi du document lui-meme (ex: "Biel/Bienne, le 10 aout 2026" n'est PAS une due_date).
  "estimated_amount": number|null,      // montant total estime, nombre seul sans devise
  "client_name_guess": string|null,     // le nom de l'entreprise ou de la personne qui COMMANDE les travaux (l'expediteur du document). Jamais notre propre entreprise (le destinataire), et jamais un tiers juste mentionne dedans (ex: le proprietaire d'un bien gere par une regie qui, elle, passe la commande).
  "confidence": "high" | "medium" | "low"
}`;
