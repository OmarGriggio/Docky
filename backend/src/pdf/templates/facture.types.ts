export interface FactureLigneDto {

    libelle: string;

    quantite: number;

    unite: string | null;

    prixUnitaire: number;

}

export interface FactureDto {

    numero: string;

    date: Date;

    client: {
        nom: string;
        adresse: string;
    };

    lignes: FactureLigneDto[];

    montantHt: number;

    montantTtc: number;

}
