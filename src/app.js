const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { ZodError } = require("zod");
const {
  createPersonaSchema,
  updatePersonaSchema,
  idSchema
} = require("./persona.schema");

function createApp(repository) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

  const parseId = (req) => idSchema.parse(req.params.id);

  app.get("/health", (req, res) => {
    res.json({ estado: "ok" });
  });

  app.post("/api/personas", asyncRoute(async (req, res) => {
    const data = createPersonaSchema.parse(req.body);
    const persona = await repository.create(data);
    res.status(201).json({ data: persona });
  }));

  app.get("/api/personas", asyncRoute(async (req, res) => {
    const personas = await repository.findAll();
    res.json({ data: personas, total: personas.length });
  }));

  app.get("/api/personas/:id", asyncRoute(async (req, res) => {
    const persona = await repository.findById(parseId(req));
    if (!persona) return res.status(404).json({ error: "Persona no encontrada" });
    res.json({ data: persona });
  }));

  const updatePersona = asyncRoute(async (req, res) => {
    const data = updatePersonaSchema.parse(req.body);
    const persona = await repository.update(parseId(req), data);
    if (!persona) return res.status(404).json({ error: "Persona no encontrada" });
    res.json({ data: persona });
  });
  app.patch("/api/personas/:id", updatePersona);
  app.put("/api/personas/:id", updatePersona);

  app.delete("/api/personas/:id", asyncRoute(async (req, res) => {
    const deleted = await repository.delete(parseId(req));
    if (!deleted) return res.status(404).json({ error: "Persona no encontrada" });
    res.status(204).send();
  }));

  app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  app.use((error, req, res, next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: error.issues.map((issue) => ({
          campo: issue.path.join(".") || "body",
          mensaje: issue.message
        }))
      });
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El RFC o correo electrónico ya existe" });
    }
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return res.status(400).json({ error: "El cuerpo debe contener JSON válido" });
    }
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}

module.exports = createApp;
