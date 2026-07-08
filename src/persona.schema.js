const { z } = require("zod");

const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const fields = {
  nombreCompleto: z.string()
    .trim()
    .min(3, "El nombre completo debe tener al menos 3 caracteres")
    .max(150, "El nombre completo no puede exceder 150 caracteres"),
  rfc: z.string()
    .trim()
    .toUpperCase()
    .regex(rfcRegex, "El RFC debe tener un formato válido (12 o 13 caracteres)"),
  correoElectronico: z.string()
    .trim()
    .toLowerCase()
    .email("El correo electrónico debe tener un formato válido")
    .max(254),
  codigoPostal: z.string()
    .trim()
    .regex(/^\d{5}$/, "El código postal debe contener exactamente 5 dígitos")
};

const createPersonaSchema = z.object(fields).strict();
const updatePersonaSchema = z.object(fields).strict().partial().refine(
  (data) => Object.keys(data).length > 0,
  "Debe proporcionar al menos un campo para actualizar"
);

const idSchema = z.coerce.number().int().positive();

module.exports = { createPersonaSchema, updatePersonaSchema, idSchema };
