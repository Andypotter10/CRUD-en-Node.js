const mysql = require("mysql2/promise");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const config = require("./config");

let pool;

async function getPool() {
  if (pool) return pool;
  let database = config.database;
  if (process.env.DB_SECRET_ARN) {
    const client = new SecretsManagerClient({});
    const response = await client.send(new GetSecretValueCommand({
      SecretId: process.env.DB_SECRET_ARN
    }));
    const secret = JSON.parse(response.SecretString);
    database = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: secret.username,
      password: secret.password,
      database: process.env.DB_NAME,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 2),
      ssl: { rejectUnauthorized: true }
    };
  }
  pool = mysql.createPool({
    ...database,
    waitForConnections: true,
    queueLimit: 0,
    charset: "utf8mb4",
    enableKeepAlive: true
  });
  return pool;
}

async function initializeDatabase() {
  const connectionPool = await getPool();
  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS personas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nombre_completo VARCHAR(150) NOT NULL,
      rfc VARCHAR(13) NOT NULL,
      correo_electronico VARCHAR(254) NOT NULL,
      codigo_postal CHAR(5) NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_personas_rfc (rfc),
      UNIQUE KEY uq_personas_correo (correo_electronico)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
}

module.exports = { getPool, initializeDatabase, closePool };
