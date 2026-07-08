"use client";

import { useEffect, useState } from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool
} from "amazon-cognito-identity-js";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const pool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "mx-central-1_x",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "x"
});
const emptyForm = {
  nombreCompleto: "",
  rfc: "",
  correoElectronico: "",
  codigoPostal: ""
};

function token() {
  return new Promise((resolve, reject) => {
    const user = pool.getCurrentUser();
    if (!user) return reject(new Error("Inicia sesión"));
    user.getSession((error, session) => {
      if (error || !session?.isValid()) return reject(error || new Error("Sesión vencida"));
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [personas, setPersonas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = pool.getCurrentUser();
    if (current) current.getSession((error, session) => {
      if (!error && session?.isValid()) {
        setUser(current);
        loadPersonas();
      }
    });
  }, []);

  async function api(path = "", options = {}) {
    const jwt = await token();
    const response = await fetch(`${apiUrl}/api/personas${path}`, {
      ...options,
      headers: {
        Authorization: jwt,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (response.status === 204) return null;
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Error en la solicitud");
    return body;
  }

  async function loadPersonas() {
    try {
      const body = await api();
      setPersonas(body.data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function login(event) {
    event.preventDefault();
    setMessage("");
    const cognitoUser = new CognitoUser({ Username: credentials.email, Pool: pool });
    cognitoUser.authenticateUser(
      new AuthenticationDetails({
        Username: credentials.email,
        Password: credentials.password
      }),
      {
        onSuccess: () => {
          setUser(cognitoUser);
          loadPersonas();
        },
        onFailure: (error) => setMessage(error.message)
      }
    );
  }

  async function save(event) {
    event.preventDefault();
    try {
      await api(editing ? `/${editing}` : "", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm);
      setEditing(null);
      setMessage("Registro guardado");
      await loadPersonas();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api(`/${id}`, { method: "DELETE" });
      await loadPersonas();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    pool.getCurrentUser()?.signOut();
    setUser(null);
    setPersonas([]);
  }

  if (!user) {
    return (
      <main className="login">
        <form className="card" onSubmit={login}>
          <p className="eyebrow">Acceso privado</p>
          <h1>Personas</h1>
          <label>Correo<input type="email" required value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} /></label>
          <label>Contraseña<input type="password" required value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} /></label>
          <button>Iniciar sesión</button>
          {message && <p className="message">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div><p className="eyebrow">AWS · México</p><h1>Administración de personas</h1></div>
        <button className="secondary" onClick={logout}>Cerrar sesión</button>
      </header>
      <section className="grid">
        <form className="card" onSubmit={save}>
          <h2>{editing ? "Editar persona" : "Nueva persona"}</h2>
          {Object.entries({
            nombreCompleto: "Nombre completo",
            rfc: "RFC",
            correoElectronico: "Correo electrónico",
            codigoPostal: "Código postal"
          }).map(([key, label]) => (
            <label key={key}>{label}<input required value={form[key]} maxLength={key === "rfc" ? 13 : undefined}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
          ))}
          <button>{editing ? "Guardar cambios" : "Crear registro"}</button>
          {editing && <button type="button" className="secondary"
            onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancelar</button>}
          {message && <p className="message">{message}</p>}
        </form>
        <section className="card list">
          <h2>Registros <span>{personas.length}</span></h2>
          {personas.map((persona) => (
            <article key={persona.id}>
              <div>
                <strong>{persona.nombreCompleto}</strong>
                <small>{persona.rfc} · {persona.correoElectronico} · CP {persona.codigoPostal}</small>
              </div>
              <div className="actions">
                <button className="secondary" onClick={() => {
                  setEditing(persona.id);
                  setForm({
                    nombreCompleto: persona.nombreCompleto,
                    rfc: persona.rfc,
                    correoElectronico: persona.correoElectronico,
                    codigoPostal: persona.codigoPostal
                  });
                }}>Editar</button>
                <button className="danger" onClick={() => remove(persona.id)}>Eliminar</button>
              </div>
            </article>
          ))}
          {!personas.length && <p className="empty">Todavía no hay registros.</p>}
        </section>
      </section>
    </main>
  );
}
