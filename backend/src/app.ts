import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { AppError } from "./shared/types/errors";
import clientRoutes from "./modules/clients/client.routes";
import addressRoutes from "./modules/clients/address.routes";
import userRoutes from "./modules/users/user.routes";
import authRoutes from "./modules/auth/auth.routes";
import supplierRoutes from "./modules/suppliers/supplier.routes";
import resourceRoutes from "./modules/catalog/resource.routes";
import resourceSupplierPriceRoutes from "./modules/catalog/resource_supplier_price.routes";
import documentRoutes from "./modules/documents/document.routes";
import documentCompleteRoutes from "./modules/documents/document_complete.routes";
import documentLineRoutes from "./modules/documents/document_line.routes";
import companyRoutes from "./modules/companies/company.routes";
import projectRoutes from "./modules/projects/project.routes";
import projectTypeRoutes from "./modules/projects/project_type.routes";
import pdfRoutes from "./pdf/pdf.routes";
import cors from 'cors';

const app = express();

// Trust the first hop in front of us (nearly every host — even a "no infra"
// PaaS plan — proxies requests through their own edge/load balancer). Without
// this, req.ip is always the proxy's IP, which silently breaks IP-based rate
// limiting (everyone shares one counter) once this is actually deployed.
app.set("trust proxy", 1);

app.use(express.json(), cors());

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/auth/login", authRoutes);

app.use("/client", clientRoutes);

app.use("/address", addressRoutes);

app.use("/supplier", supplierRoutes);

app.use("/resource", resourceRoutes);

app.use("/resource-supplier-price", resourceSupplierPriceRoutes);

app.use("/document", documentRoutes);

app.use("/document-complete", documentCompleteRoutes);

app.use("/document-line", documentLineRoutes);

app.use("/company", companyRoutes);

app.use("/user", userRoutes);

app.use("/project", projectRoutes);

app.use("/project-type", projectTypeRoutes);

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
