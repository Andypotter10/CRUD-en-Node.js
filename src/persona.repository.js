const { getPool } = require("./database");

const selectColumns = `
  id,
  nombre_completo AS nombreCompleto,
  rfc,
  correo_electronico AS correoElectronico,
  codigo_postal AS codigoPostal,
  creado_en AS creadoEn,
  actualizado_en AS actualizadoEn
`;

class PersonaRepository {
  async create(data) {
    const pool = await getPool();
    const [result] = await pool.execute(
      `INSERT INTO personas
       (nombre_completo, rfc, correo_electronico, codigo_postal)
       VALUES (?, ?, ?, ?)`,
      [data.nombreCompleto, data.rfc, data.correoElectronico, data.codigoPostal]
    );
    return this.findById(result.insertId);
  }

  async findAll() {
    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT ${selectColumns} FROM personas ORDER BY id DESC`
    );
    return rows;
  }

  async findById(id) {
    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT ${selectColumns} FROM personas WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async update(id, data) {
    const pool = await getPool();
    const columns = {
      nombreCompleto: "nombre_completo",
      rfc: "rfc",
      correoElectronico: "correo_electronico",
      codigoPostal: "codigo_postal"
    };
    const entries = Object.entries(data);
    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    const [result] = await pool.execute(
      `UPDATE personas SET ${assignments} WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows ? this.findById(id) : null;
  }

  async delete(id) {
    const pool = await getPool();
    const [result] = await pool.execute("DELETE FROM personas WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = PersonaRepository;
