import express from "express";
import clientRoutes from "./routes/client.routes";
import adresseRoutes from "./routes/adresse.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import fournisseurRoutes from "./routes/fournisseur.routes";
import ressourceRoutes from "./routes/ressource.routes";
import ressourceTarifFournisseurRoutes from "./routes/ressource_tarif_fournisseur.routes";
import documentRoutes from "./routes/document.routes";
import documentCompleteRoutes from "./routes/document_complete.routes";
import entrepriseRoutes from "./routes/entreprise.routes";
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