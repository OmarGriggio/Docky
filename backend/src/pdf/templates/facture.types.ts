export interface FactureLigneDto {
    libelle: string;
    quantite: number;
    unite: string | null;
    prixUnitaire: number;
}

export interface FactureDto {
    numero: string;
    date: Date;
    entreprise : {
        nom: string;
        rue: string;
        ville: string;
        npaVille: string;
        logo: string | null;
    };
    client: {
        nom: string;
        rue: string;
        ville: string;
        npaVille: string;
        civilite: string;
    };
    lignes: FactureLigneDto[];
    montantHt: number;
    montantTtc: number;
    introduction: string;
    conclusion: string;
}
