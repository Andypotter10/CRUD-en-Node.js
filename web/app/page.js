"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
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

const fields = [
  { key: "nombreCompleto", label: "Nombre completo", placeholder: "Ej. Andrea López García", icon: "user" },
  { key: "rfc", label: "RFC", placeholder: "LOGA900101AB1", icon: "id" },
  { key: "correoElectronico", label: "Correo electrónico", placeholder: "correo@ejemplo.com", icon: "mail", type: "email" },
  { key: "codigoPostal", label: "Código postal", placeholder: "03100", icon: "pin", inputMode: "numeric" }
];

function Icon({ name, size = 20 }) {
  const paths = {
    user: <><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    id: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M12 10h5M12 14h4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 11M4 13l2.4 4.6A7 7 0 0 0 17.9 15"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    cloud: <><path d="M17.5 19H6a4 4 0 0 1-.5-8 6.5 6.5 0 0 1 12.6-1.5A4.8 4.8 0 0 1 17.5 19Z"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function getToken() {
  return new Promise((resolve, reject) => {
    const user = pool.getCurrentUser();
    if (!user) return reject(new Error("Inicia sesión para continuar"));
    user.getSession((error, session) => {
      if (error || !session?.isValid()) {
        return reject(error || new Error("La sesión venció"));
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [personas, setPersonas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    const current = pool.getCurrentUser();
    if (!current) return;
    current.getSession((error, session) => {
      if (!error && session?.isValid()) {
        setUser(current);
        loadPersonas();
      }
    });
  }, []);

  const filteredPersonas = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return personas;
    return personas.filter((persona) =>
      [persona.nombreCompleto, persona.rfc, persona.correoElectronico, persona.codigoPostal]
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [personas, query]);

  async function api(path = "", options = {}) {
    const jwt = await getToken();
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
    if (!response.ok) {
      const detail = body.detalles?.[0]?.mensaje;
      throw new Error(detail || body.error || "No fue posible completar la solicitud");
    }
    return body;
  }

  async function loadPersonas() {
    setLoading(true);
    try {
      const body = await api();
      setPersonas(body.data);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  function login(event) {
    event.preventDefault();
    setNotice(null);
    setAuthLoading(true);
    const cognitoUser = new CognitoUser({ Username: credentials.email, Pool: pool });
    cognitoUser.authenticateUser(
      new AuthenticationDetails({
        Username: credentials.email,
        Password: credentials.password
      }),
      {
        onSuccess: () => {
          setUser(cognitoUser);
          setAuthLoading(false);
          loadPersonas();
        },
        onFailure: (error) => {
          setAuthLoading(false);
          setNotice({ type: "error", text: error.message });
        }
      }
    );
  }

  function register(event) {
    event.preventDefault();
    setNotice(null);
    if (credentials.password !== confirmPassword) {
      setNotice({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    setAuthLoading(true);
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: credentials.email })
    ];
    pool.signUp(credentials.email, credentials.password, attributes, null, (error, result) => {
      setAuthLoading(false);
      if (error) {
        setNotice({ type: "error", text: error.message });
        return;
      }
      if (result.userConfirmed) {
        setAuthMode("login");
        setNotice({ type: "success", text: "Cuenta creada. Ya puedes iniciar sesión." });
        return;
      }
      setPendingEmail(credentials.email);
      setConfirmationCode("");
      setAuthMode("confirm");
      setNotice({ type: "success", text: "Enviamos un código de verificación a tu correo." });
    });
  }

  function confirmAccount(event) {
    event.preventDefault();
    setNotice(null);
    setAuthLoading(true);
    const email = pendingEmail || credentials.email;
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.confirmRegistration(confirmationCode.trim(), true, (error) => {
      setAuthLoading(false);
      if (error) {
        setNotice({ type: "error", text: error.message });
        return;
      }
      setCredentials({ email, password: "" });
      setConfirmPassword("");
      setConfirmationCode("");
      setAuthMode("login");
      setNotice({ type: "success", text: "Correo confirmado. Ya puedes iniciar sesión." });
    });
  }

  function resendCode() {
    const email = pendingEmail || credentials.email;
    if (!email) return;
    setNotice(null);
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.resendConfirmationCode((error) => {
      setNotice(error
        ? { type: "error", text: error.message }
        : { type: "success", text: "Enviamos un código nuevo a tu correo." });
    });
  }

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setNotice(null);
    setConfirmationCode("");
    setConfirmPassword("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api(editing ? `/${editing}` : "", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm);
      setEditing(null);
      setNotice({
        type: "success",
        text: editing ? "Los cambios se guardaron correctamente" : "La persona fue registrada correctamente"
      });
      await loadPersonas();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      await api(`/${id}`, { method: "DELETE" });
      setNotice({ type: "success", text: "El registro fue eliminado" });
      await loadPersonas();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function startEditing(persona) {
    setEditing(persona.id);
    setForm({
      nombreCompleto: persona.nombreCompleto,
      rfc: persona.rfc,
      correoElectronico: persona.correoElectronico,
      codigoPostal: persona.codigoPostal
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditing(null);
    setForm(emptyForm);
  }

  function logout() {
    pool.getCurrentUser()?.signOut();
    setUser(null);
    setPersonas([]);
    setCredentials({ email: "", password: "" });
    setNotice(null);
  }

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-glow glow-one" />
        <div className="login-glow glow-two" />
        <section className="login-shell">
          <div className="login-story">
            <div className="brand">
              <span className="brand-mark"><Icon name="users" size={24} /></span>
              <span>Personas<span className="brand-dot">.</span></span>
            </div>
            <div className="story-copy">
              <span className="pill"><span className="status-dot" /> Infraestructura activa</span>
              <h1>Información organizada.<br /><em>Decisiones más simples.</em></h1>
              <p>Una plataforma segura para administrar registros de personas, respaldada por servicios administrados de AWS.</p>
            </div>
            <div className="architecture">
              <div><Icon name="cloud" /><span>API serverless</span><small>AWS Lambda</small></div>
              <div><Icon name="lock" /><span>Acceso privado</span><small>Amazon Cognito</small></div>
              <div><Icon name="database" /><span>Datos persistentes</span><small>RDS MySQL</small></div>
            </div>
            <p className="story-foot">Desplegado en AWS México · mx-central-1</p>
          </div>

          <div className="login-panel">
            <form className="login-form"
              onSubmit={authMode === "login" ? login : authMode === "register" ? register : confirmAccount}>
              <span className="mobile-brand">Personas<span>.</span></span>
              {authMode !== "confirm" && (
                <div className="auth-switch" role="tablist" aria-label="Acceso a la cuenta">
                  <button type="button" className={authMode === "login" ? "active" : ""}
                    onClick={() => changeAuthMode("login")}>Iniciar sesión</button>
                  <button type="button" className={authMode === "register" ? "active" : ""}
                    onClick={() => changeAuthMode("register")}>Crear cuenta</button>
                </div>
              )}

              <p className="eyebrow">
                {authMode === "login" ? "Bienvenido de nuevo" : authMode === "register" ? "Únete a la plataforma" : "Verifica tu correo"}
              </p>
              <h2>
                {authMode === "login" ? "Inicia sesión" : authMode === "register" ? "Crea tu cuenta" : "Confirma tu cuenta"}
              </h2>
              <p className="form-intro">
                {authMode === "login" && "Ingresa tus credenciales para acceder al panel administrativo."}
                {authMode === "register" && "Regístrate con tu correo. Te enviaremos un código para validar tu cuenta."}
                {authMode === "confirm" && <>Escribe el código enviado a <strong>{pendingEmail || credentials.email}</strong>.</>}
              </p>

              {authMode === "confirm" ? (
                <>
                  <label>
                    <span>Código de verificación</span>
                    <div className="input-wrap confirmation-input">
                      <Icon name="check" />
                      <input required inputMode="numeric" autoComplete="one-time-code"
                        maxLength={6} placeholder="000000" value={confirmationCode}
                        onChange={(event) => setConfirmationCode(event.target.value.replace(/\D/g, ""))} />
                    </div>
                  </label>
                  <button className="primary login-submit" disabled={authLoading || confirmationCode.length !== 6}>
                    {authLoading ? <span className="spinner" /> : "Confirmar correo"}
                  </button>
                  <div className="confirmation-actions">
                    <button type="button" onClick={resendCode}>Reenviar código</button>
                    <button type="button" onClick={() => changeAuthMode("login")}>Volver al acceso</button>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    <span>Correo electrónico</span>
                    <div className="input-wrap">
                      <Icon name="mail" />
                      <input type="email" required autoComplete="username"
                        placeholder="nombre@empresa.com" value={credentials.email}
                        onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} />
                    </div>
                  </label>
                  <label>
                    <span>Contraseña</span>
                    <div className="input-wrap">
                      <Icon name="lock" />
                      <input type={showPassword ? "text" : "password"} required
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                        placeholder="••••••••••••" value={credentials.password}
                        onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
                      <button type="button" className="icon-button password-toggle"
                        aria-label="Mostrar u ocultar contraseña"
                        onClick={() => setShowPassword((visible) => !visible)}>
                        <Icon name="eye" />
                      </button>
                    </div>
                  </label>
                  {authMode === "register" && (
                    <>
                      <label>
                        <span>Confirmar contraseña</span>
                        <div className="input-wrap">
                          <Icon name="lock" />
                          <input type={showPassword ? "text" : "password"} required
                            autoComplete="new-password" placeholder="Repite tu contraseña"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)} />
                        </div>
                      </label>
                      <p className="password-rules">Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.</p>
                    </>
                  )}
                  <button className="primary login-submit" disabled={authLoading}>
                    {authLoading ? <span className="spinner" /> : authMode === "login" ? "Entrar al panel" : "Crear mi cuenta"}
                  </button>
                </>
              )}
              {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
              <div className="secure-note"><Icon name="lock" size={15} /> Conexión protegida con Amazon Cognito</div>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="users" size={22} /></span>
          <span>Personas<span className="brand-dot">.</span></span>
        </div>
        <nav>
          <a className="active" href="#directorio"><Icon name="users" /> Directorio</a>
          <a href="#registro"><Icon name="plus" /> Nuevo registro</a>
        </nav>
        <div className="sidebar-status">
          <span className="status-dot" />
          <div><strong>Sistema operativo</strong><small>API conectada</small></div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Directorio de personas</h1>
          </div>
          <div className="topbar-actions">
            <span className="environment"><span className="status-dot" /> AWS México</span>
            <button className="ghost-button" onClick={logout}><Icon name="logout" /> Salir</button>
          </div>
        </header>

        {notice && (
          <div className={`notice dashboard-notice ${notice.type}`}>
            <span className="notice-icon"><Icon name={notice.type === "success" ? "check" : "lock"} /></span>
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button>
          </div>
        )}

        <section className="summary-grid">
          <article className="summary-card accent">
            <span className="summary-icon"><Icon name="users" /></span>
            <div><small>Registros totales</small><strong>{personas.length}</strong><p>Personas en el directorio</p></div>
          </article>
          <article className="summary-card">
            <span className="summary-icon purple"><Icon name="lock" /></span>
            <div><small>Seguridad</small><strong>Activa</strong><p>Protegido con Cognito</p></div>
          </article>
          <article className="summary-card">
            <span className="summary-icon amber"><Icon name="database" /></span>
            <div><small>Base de datos</small><strong>MySQL</strong><p>Amazon RDS conectado</p></div>
          </article>
        </section>

        <section className="workspace-grid">
          <form id="registro" className="panel form-panel" onSubmit={save}>
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">{editing ? "Editando registro" : "Alta de persona"}</span>
                <h2>{editing ? "Actualizar información" : "Nueva persona"}</h2>
              </div>
              <span className="heading-icon"><Icon name={editing ? "edit" : "plus"} /></span>
            </div>
            <p className="panel-description">
              {editing ? "Modifica los campos necesarios y guarda los cambios." : "Completa los datos obligatorios para crear un registro."}
            </p>

            <div className="fields">
              {fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <div className="input-wrap">
                    <Icon name={field.icon} />
                    <input required type={field.type || "text"} inputMode={field.inputMode}
                      placeholder={field.placeholder} value={form[field.key]}
                      maxLength={field.key === "rfc" ? 13 : field.key === "codigoPostal" ? 5 : undefined}
                      onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
                  </div>
                </label>
              ))}
            </div>
            <button className="primary save-button" disabled={saving}>
              {saving ? <span className="spinner" /> : <><Icon name={editing ? "check" : "plus"} /> {editing ? "Guardar cambios" : "Crear registro"}</>}
            </button>
            {editing && <button type="button" className="cancel-button" onClick={cancelEditing}>Cancelar edición</button>}
          </form>

          <section id="directorio" className="panel directory-panel">
            <div className="directory-header">
              <div>
                <span className="panel-kicker">Base de datos</span>
                <h2>Personas registradas <span className="count">{personas.length}</span></h2>
              </div>
              <button className="icon-button refresh-button" onClick={loadPersonas} aria-label="Actualizar registros">
                <Icon name="refresh" />
              </button>
            </div>

            <div className="search-wrap">
              <Icon name="search" />
              <input aria-label="Buscar personas" placeholder="Buscar por nombre, RFC, correo o C.P."
                value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button onClick={() => setQuery("")} aria-label="Limpiar búsqueda">×</button>}
            </div>

            <div className="records">
              {loading && <div className="loading-state"><span className="spinner dark" /> Consultando registros…</div>}
              {!loading && filteredPersonas.map((persona) => (
                <article className="person-card" key={persona.id}>
                  <span className="avatar">{initials(persona.nombreCompleto)}</span>
                  <div className="person-main">
                    <strong>{persona.nombreCompleto}</strong>
                    <a href={`mailto:${persona.correoElectronico}`}>{persona.correoElectronico}</a>
                  </div>
                  <div className="person-meta">
                    <span><small>RFC</small>{persona.rfc}</span>
                    <span><small>Código postal</small>{persona.codigoPostal}</span>
                  </div>
                  <div className="record-actions">
                    <button className="icon-button edit-button" onClick={() => startEditing(persona)}
                      aria-label={`Editar a ${persona.nombreCompleto}`}><Icon name="edit" /></button>
                    <button className="icon-button delete-button" onClick={() => remove(persona.id)}
                      aria-label={`Eliminar a ${persona.nombreCompleto}`}><Icon name="trash" /></button>
                  </div>
                </article>
              ))}
              {!loading && !filteredPersonas.length && (
                <div className="empty-state">
                  <span><Icon name={query ? "search" : "users"} size={28} /></span>
                  <h3>{query ? "Sin coincidencias" : "Aún no hay registros"}</h3>
                  <p>{query ? "Prueba con otro nombre, RFC o correo." : "Completa el formulario para agregar la primera persona."}</p>
                </div>
              )}
            </div>
          </section>
        </section>

        <footer>CRUD Personas · Node.js, Next.js y AWS · {new Date().getFullYear()}</footer>
      </main>
    </div>
  );
}
