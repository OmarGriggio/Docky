import express from "express";
import healthRoutes from "./routes/health.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;