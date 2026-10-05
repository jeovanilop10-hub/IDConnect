import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

// Scoped to this screen via the .login-idara wrapper. Follows the official IDara
// BrandBook 2025: Verde Core / Obsidiana / Síntegra / Bruma + Azul Quantum as the
// only action color, IBM Plex Sans for titles and Roboto for body, and the official
// ID Issuance product lockup endorsed by the IDara logo.
// Layout uses two registers: a dark brand panel and the form on white "paper".
const IDARA_STYLES = `
  .login-idara {
    --core: #0a4032;
    --sintegra: #b7eee2;
    --obsidiana: #020f0a;
    --bruma: #f4fff4;
    --quantum: #77dce8;
    --ink-soft: rgba(10, 64, 50, 0.72);
    --hairline: rgba(10, 64, 50, 0.14);
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    background: #ffffff;
    font-family: "Roboto", "Segoe UI", Arial, sans-serif;
    color: var(--core);
  }

  .login-idara h1,
  .login-idara h2,
  .login-idara .eyebrow {
    font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
  }

  /* Brand panel: the dark register */
  .login-idara .brand {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 3rem;
    padding: 3rem clamp(2rem, 5vw, 4.5rem);
    color: var(--bruma);
    background:
      radial-gradient(90% 70% at 0% 0%, rgba(183, 238, 226, 0.14) 0%, transparent 60%),
      linear-gradient(160deg, var(--core) 0%, var(--obsidiana) 100%);
  }

  /* Diamond watermark (the IDara decorative motif), low opacity, top-right */
  .login-idara .brand::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(45deg, rgba(244, 255, 244, 0.06) 0 1px, transparent 1px 34px),
      repeating-linear-gradient(-45deg, rgba(244, 255, 244, 0.06) 0 1px, transparent 1px 34px);
    -webkit-mask-image: radial-gradient(circle 30rem at 100% 0%, black 0%, transparent 100%);
    mask-image: radial-gradient(circle 30rem at 100% 0%, black 0%, transparent 100%);
  }

  .login-idara .brand > * {
    position: relative;
    z-index: 1;
  }

  /* Official lockup, aspect ratio 3.75:1 kept by fixing only the width */
  .login-idara .product-logo {
    display: block;
    width: 220px;
    height: auto;
  }

  .login-idara .tagline {
    font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--quantum);
    margin: 0 0 1.1rem;
  }

  .login-idara .brand h2 {
    font-weight: 600;
    font-size: clamp(1.9rem, 3.2vw, 2.6rem);
    line-height: 1.15;
    letter-spacing: -0.015em;
    margin: 0 0 1.25rem;
    max-width: 30rem;
  }

  .login-idara .brand h2 em {
    font-style: normal;
    color: var(--sintegra);
  }

  .login-idara .brand p.lead {
    margin: 0;
    max-width: 28rem;
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(244, 255, 244, 0.78);
  }

  .login-idara .steps {
    list-style: none;
    padding: 0;
    margin: 2rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .login-idara .steps li {
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    border: 1px solid rgba(183, 238, 226, 0.28);
    color: var(--sintegra);
  }

  .login-idara .endorsement {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(244, 255, 244, 0.14);
    font-size: 0.78rem;
    color: rgba(244, 255, 244, 0.78);
  }

  .login-idara .endorsement b {
    color: var(--bruma);
    font-weight: 500;
  }

  .login-idara .endorsement .dot {
    color: var(--quantum);
    margin: 0 0.45rem;
  }

  .login-idara .by-idara {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    white-space: nowrap;
  }

  /* IDara horizontal lockup ~1.95:1, at its 100px digital minimum width */
  .login-idara .by-idara img {
    width: 100px;
    height: auto;
    display: block;
  }

  /* Form side: the light "paper" register */
  .login-idara .form-side {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1.5rem;
  }

  .login-idara .card {
    width: 100%;
    max-width: 24rem;
    background: #ffffff;
    border: 1px solid var(--hairline);
    border-radius: 8px;
    padding: 2.25rem 2rem;
  }

  .login-idara .eyebrow {
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin: 0 0 0.6rem;
  }

  .login-idara h1 {
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 1.2;
    margin: 0 0 0.4rem;
  }

  .login-idara .hint {
    margin: 0 0 1.75rem;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }

  .login-idara label {
    display: block;
    margin-bottom: 1.1rem;
  }

  .login-idara label span {
    display: block;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--ink-soft);
    margin-bottom: 0.4rem;
  }

  .login-idara input {
    width: 100%;
    background: #ffffff;
    border: 1px solid rgba(10, 64, 50, 0.24);
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-family: inherit;
    font-size: 0.95rem;
    color: var(--core);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .login-idara input:focus {
    outline: none;
    border-color: var(--core);
    box-shadow: 0 0 0 3px rgba(119, 220, 232, 0.45);
  }

  .login-idara .error {
    background: rgba(168, 68, 63, 0.08);
    border-left: 3px solid #a8443f;
    color: #7f2f2b;
    font-size: 0.85rem;
    line-height: 1.45;
    border-radius: 6px;
    padding: 0.7rem 0.85rem;
    margin: -0.15rem 0 1.1rem;
  }

  /* Azul Quantum pill: the only action color, with Verde Core text (7.4:1) */
  .login-idara button[type="submit"] {
    width: 100%;
    background: var(--quantum);
    color: var(--core);
    font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    border: none;
    border-radius: 999px;
    padding: 0.8rem 1rem;
    cursor: pointer;
    transition: filter 0.15s ease, transform 0.1s ease;
  }

  .login-idara button[type="submit"]:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .login-idara button[type="submit"]:active:not(:disabled) {
    transform: translateY(1px);
  }

  .login-idara button[type="submit"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-idara button:focus-visible,
  .login-idara input:focus-visible {
    outline: 2px solid var(--core);
    outline-offset: 2px;
  }

  .login-idara .card-footer {
    margin: 1.5rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-soft);
    text-align: center;
  }

  /* Phones and narrow tablets: brand panel becomes a compact header */
  @media (max-width: 860px) {
    .login-idara {
      grid-template-columns: 1fr;
    }
    .login-idara .brand {
      gap: 1.25rem;
      padding: 1.75rem 1.5rem 2rem;
    }
    .login-idara .product-logo {
      width: 180px;
    }
    .login-idara .brand h2 {
      font-size: 1.5rem;
      margin-bottom: 0;
    }
    .login-idara .brand p.lead,
    .login-idara .steps,
    .login-idara .endorsement {
      display: none;
    }
    .login-idara .form-side {
      align-items: flex-start;
      padding: 1.75rem 1rem 2.5rem;
    }
    .login-idara .card {
      padding: 1.75rem 1.4rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-idara * { transition-duration: 0.001ms !important; }
  }
`;

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: Location } };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      const target = (location.state?.from as unknown as { pathname?: string })?.pathname ?? "/";
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else if (err instanceof ApiError) {
        setError(`El backend respondió con un error (${err.status}): ${err.message}`);
      } else {
        setError(
          "No se pudo contactar al backend. Verifica que esté corriendo en el puerto 8081 y revisa la consola del navegador (F12) para más detalle.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-idara">
      <style>{IDARA_STYLES}</style>

      <section className="brand" aria-label="ID Issuance">
        <img className="product-logo" src="/brand/idara-issuance-white.svg" alt="ID Issuance" />

        <div>
          <p className="tagline">Where identity simplifies access</p>
          <h2>
            Emite y personaliza credenciales <em>desde un solo panel</em>
          </h2>
          <p className="lead">
            Selecciona la organización, configura el perfil de producción y envía cada tarjeta a la impresora
            Fargo correcta, con seguimiento de su estado.
          </p>
          <ul className="steps" aria-label="Flujo de emisión">
            <li>Organización</li>
            <li>Perfil</li>
            <li>Parámetros</li>
            <li>Impresión</li>
          </ul>
        </div>

        <div className="endorsement">
          <span>
            <b>HID</b> Fargo Connect<span className="dot">•</span>Construido por <b>RISI Technologies</b>
          </span>
          <span className="by-idara">
            Ecosistema
            <img src="/brand/idara-horizontal-white.svg" alt="IDara" />
          </span>
        </div>
      </section>

      <div className="form-side">
        <form onSubmit={handleSubmit} className="card">
          <p className="eyebrow">Acceso al panel</p>
          <h1>Inicia sesión</h1>
          <p className="hint">Usa la cuenta que te asignó el administrador de tu organización.</p>

          <label>
            <span>Usuario</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting || !username || !password}>
            {submitting ? "Ingresando…" : "Ingresar →"}
          </button>

          <p className="card-footer">¿Problemas para entrar? Contacta al administrador de ID Issuance.</p>
        </form>
      </div>
    </div>
  );
}
