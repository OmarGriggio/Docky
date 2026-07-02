import express from "express";
import healthRoutes from "./routes/health.routes";
import clientRoutes from "./routes/client.routes";
import userRoutes from "./routes/user.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);

app.use("/client", clientRoutes);

app.use("/user", userRoutes )

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;