import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { AppError } from "./shared/types/errors";
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
import chantierRoutes from "./modules/chantiers/chantier.routes";
import typeChantierRoutes from "./modules/chantiers/type_chantier.routes";
import pdfRoutes from "./pdf/pdf.routes";
import cors from 'cors';

const app = express();

app.use(express.json(), cors());

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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

app.use("/chantier", chantierRoutes);

app.use("/type-chantier", typeChantierRoutes);

app.use("/pdf", pdfRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

// Central error handler: business errors (NotFoundError, ConflictError,
// UnauthorizedError, ...) map to their own status code, anything else is an
// unexpected bug and stays a 500. Express 5 forwards rejected promises from
// async route handlers here automatically, so no try/catch is needed in
// controllers/services — just `throw new NotFoundError(...)` etc.
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;