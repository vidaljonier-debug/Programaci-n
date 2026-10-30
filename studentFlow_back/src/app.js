import express from "express";
import healthRoutes from "./routes/health.routes.js";
import materiasRoutes from "./routes/materias.routes.js";
import recordatoriosRoutes from "./routes/recordatorios.routes.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import { attachTemporaryUser } from "./middlewares/request-context.middleware.js";
import { sendSuccess } from "./utils/api-response.js";

const app = express();

app.use(express.json());
app.use(attachTemporaryUser);

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/materias", materiasRoutes);
app.use("/api/v1/recordatorios", recordatoriosRoutes);
app.get("/api/v1", (_request, response) => sendSuccess(response, {
  name: "StudentFlow API",
  version: "v1",
  endpoints: {
    health: "/api/v1/health",
    materias: "/api/v1/materias",
    recordatorios: "/api/v1/recordatorios"
  }
}));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;