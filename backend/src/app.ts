import express from "express";
import clientRoutes from "./routes/client.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import factureRoutes from "./routes/facture.routes";
import fournisseurRoutes from "./routes/fournisseur.routes";
import materielRoutes from "./routes/materiel.routes";
import cors from 'cors';

const app = express();

app.use(express.json(), cors());

app.use("/auth/login", authRoutes);

app.use("/client", clientRoutes);

app.use("/fournisseur", fournisseurRoutes);

app.use("/materiel", materielRoutes);

app.use("/facture", factureRoutes);

app.use("/user", userRoutes )

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;