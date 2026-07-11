import express from "express";
import clientRoutes from "./modules/clients/client.routes";
import adresseRoutes from "./modules/clients/adresse.routes";
import userRoutes from "./modules/utilisateurs/user.routes";
import authRoutes from "./modules/auth/auth.routes";
import fournisseurRoutes from "./modules/fournisseurs/fournisseur.routes";
import ressourceRoutes from "./modules/catalogue/ressource.routes";
import ressourceTarifFournisseurRoutes from "./modules/catalogue/ressource_tarif_fournisseur.routes";
import documentRoutes from "./modules/documents/document.routes";
import documentCompleteRoutes from "./modules/documents/document_complete.routes";
import entrepriseRoutes from "./modules/entreprises/entreprise.routes";
import cors from 'cors';

const app = express();

app.use(express.json(), cors());

app.use("/auth/login", authRoutes);

app.use("/client", clientRoutes);

app.use("/adresse", adresseRoutes);

app.use("/fournisseur", fournisseurRoutes);

app.use("/ressource", ressourceRoutes);

app.use("/ressource-tarif-fournisseur", ressourceTarifFournisseurRoutes);

app.use("/document", documentRoutes);

app.use("/document-complete", documentCompleteRoutes);

app.use("/entreprise", entrepriseRoutes);

app.use("/user", userRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;