import { Client } from '../../../shared/models/client';
import { clientDisplayName } from '../../../shared/utils/display';

// Best-effort match between the scanner's own free-text guess
// (client_name_guess) and an existing client - used only to pre-select a
// starting point in the client picker, never to silently trust a match the
// user hasn't seen themselves. Case-insensitive and accent-insensitive
// (handles the LLM dropping an accent - "Hotel du Cervin SA" matching
// "Hôtel du Cervin SA" - seen in practice while testing the prompt), either
// name containing the other. Returns null rather than guessing on anything
// weaker than that, or when several clients tie.
export const matchClientByName = (clients: Client[], nameGuess: string | null): Client | null => {
    if (!nameGuess) {
        return null;
    }

    const guess = normalize(nameGuess);
    if (!guess) {
        return null;
    }

    const matches = clients.filter(client => {
        const name = normalize(clientDisplayName(client));
        return name.length > 0 && (name.includes(guess) || guess.includes(name));
    });

    return matches.length === 1 ? matches[0] : null;
};

const normalize = (value: string): string =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
