import { FactureComplete } from "../types/facture_complete";
import { getFacturesFromDB, getFactureByIdFromDB } from "../repositories/facture.repository";
import { getFacturesLignesFromDB, getLignesByFactureIdFromDB } from "../repositories/facture_ligne.repository";

export const getFactureCompleteServ = async (id: number): Promise<FactureComplete> => {
  const facture = await getFactureByIdFromDB(id);
  if (!facture) {
    throw new Error("Facture not found");
  }

  const lignes = await getLignesByFactureIdFromDB(id);
  return { ...facture, lignes };
};

export const getAllFacturesCompleteServ = async (): Promise<FactureComplete[]> => {
  const factures = await getFacturesFromDB();
  const lignes = await getFacturesLignesFromDB();

  return factures.map(facture => ({
    ...facture,
    lignes: lignes.filter(ligne => ligne.id_facture === facture.id)
  }));
};
