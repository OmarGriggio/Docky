import express from "express";
import clientRoutes from "./routes/client.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import fournisseurRoutes from "./routes/fournisseur.routes";
import materielRoutes from "./routes/materiel.routes";
import serviceRoutes from "./routes/service.routes";
import documentRoutes from "./routes/document.routes";
import documentCompleteRoutes from "./routes/document_complete.routes";
import cors from 'cors';

const app = express();

app.use(express.json(), cors());

app.use("/auth/login", authRoutes);

app.use("/client", clientRoutes);

app.use("/fournisseur", fournisseurRoutes);

app.use("/materiel", materielRoutes);

app.use("/service", serviceRoutes);

app.use("/document", documentRoutes);

app.use("/document-complete", documentCompleteRoutes);

app.use("/user", userRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;