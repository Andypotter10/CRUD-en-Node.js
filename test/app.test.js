const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const createApp = require("../src/app");

function repository(initial = []) {
  let rows = [...initial];
  return {
    async create(data) {
      const row = { id: rows.length + 1, ...data };
      rows.push(row);
      return row;
    },
    async findAll() { return rows; },
    async findById(id) { return rows.find((row) => row.id === id) || null; },
    async update(id, data) {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return null;
      rows[index] = { ...rows[index], ...data };
      return rows[index];
    },
    async delete(id) {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    }
  };
}

const valid = {
  nombreCompleto: "María López García",
  rfc: "LOGM900101AB1",
  correoElectronico: "maria@example.com",
  codigoPostal: "03100"
};

test("reporta el servicio como activo", async () => {
  const response = await request(createApp(repository())).get("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { estado: "activo" });
});

test("crea y normaliza una persona", async () => {
  const response = await request(createApp(repository()))
    .post("/api/personas")
    .send({ ...valid, rfc: valid.rfc.toLowerCase(), correoElectronico: "MARIA@EXAMPLE.COM" });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.rfc, valid.rfc);
  assert.equal(response.body.data.correoElectronico, valid.correoElectronico);
});

test("rechaza RFC, correo y código postal inválidos", async () => {
  const response = await request(createApp(repository()))
    .post("/api/personas")
    .send({ nombreCompleto: "Juan Pérez", rfc: "INVALIDO", correoElectronico: "x", codigoPostal: "123" });
  assert.equal(response.status, 400);
  assert.equal(response.body.detalles.length, 3);
});

test("lista, obtiene, actualiza y elimina personas", async () => {
  const app = createApp(repository([{ id: 1, ...valid }]));
  assert.equal((await request(app).get("/api/personas")).body.total, 1);
  assert.equal((await request(app).get("/api/personas/1")).status, 200);
  const updated = await request(app).patch("/api/personas/1").send({ codigoPostal: "64000" });
  assert.equal(updated.body.data.codigoPostal, "64000");
  assert.equal((await request(app).delete("/api/personas/1")).status, 204);
  assert.equal((await request(app).get("/api/personas/1")).status, 404);
});

test("permite actualización mediante PUT", async () => {
  const app = createApp(repository([{ id: 1, ...valid }]));
  const response = await request(app).put("/api/personas/1").send({ codigoPostal: "01000" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.codigoPostal, "01000");
});

test("rechaza actualizaciones vacías e ids inválidos", async () => {
  const app = createApp(repository());
  assert.equal((await request(app).patch("/api/personas/1").send({})).status, 400);
  assert.equal((await request(app).get("/api/personas/abc")).status, 400);
});
