const serverless = require("serverless-http");
const createApp = require("./app");
const PersonaRepository = require("./persona.repository");
const { initializeDatabase } = require("./database");

let initialized;
const app = createApp(new PersonaRepository());
const httpHandler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  initialized ||= initializeDatabase();
  await initialized;
  return httpHandler(event, context);
};
