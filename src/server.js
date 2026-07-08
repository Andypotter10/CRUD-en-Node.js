const config = require("./config");
const { initializeDatabase, closePool } = require("./database");
const PersonaRepository = require("./persona.repository");
const createApp = require("./app");

async function start() {
  await initializeDatabase();
  const app = createApp(new PersonaRepository());
  const server = app.listen(config.port, () => {
    console.log(`API disponible en http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("No fue posible iniciar el servicio:", error.message);
  process.exit(1);
});
