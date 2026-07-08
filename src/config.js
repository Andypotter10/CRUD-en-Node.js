require("dotenv").config();

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} debe ser un entero positivo`);
  }
  return value;
}

module.exports = {
  port: numberFromEnv("PORT", 3000),
  database: {
    host: process.env.DB_HOST || "localhost",
    port: numberFromEnv("DB_PORT", 3306),
    user: process.env.DB_USER || "crud_user",
    password: process.env.DB_PASSWORD || "crud_password",
    database: process.env.DB_NAME || "crud_personas",
    connectionLimit: numberFromEnv("DB_CONNECTION_LIMIT", 10)
  }
};
