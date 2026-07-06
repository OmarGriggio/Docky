import express from "express";
import clientRoutes from "./routes/client.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.use("/auth/login", authRoutes);

app.use("/client", clientRoutes);

app.use("/user", userRoutes )

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;