import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

// Scoped to this screen only, via the .login-idara wrapper below — the rest
// of the app keeps its existing light corporate theme untouched. Colors and
// type come from IDara's brand kit (forest green + a single cyan accent,
// Poppins for display/eyebrow text).
const IDARA_STYLES = `
  .login-idara {
    --bg-deep: #112921;
    --bg-mid: #17362B;
    --bg-nav: #2E4E43;
    --text-white: #F6FFF5;
    --text-mint: #C3EDE2;
    --text-body: #DCF2EB;
    --text-muted: #B3D7CD;
    --accent-cyan: #90DAE6;
    min-height: 100vh;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: radial-gradient(120% 140% at 15% 10%, var(--bg-mid) 0%, var(--bg-deep) 65%);
    font-family: "Poppins", "Inter", sans-serif;
    overflow: hidden;
  }

  .login-idara .watermark {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(45deg, rgba(246, 255, 245, 0.055) 0, rgba(246, 255, 245, 0.055) 1px, transparent 1px, transparent 32px),
      repeating-linear-gradient(-45deg, rgba(246, 255, 245, 0.055) 0, rgba(246, 255, 245, 0.055) 1px, transparent 1px, transparent 32px);
    -webkit-mask-image: radial-gradient(circle 26rem at 100% 0%, black 0%, transparent 100%);
    mask-image: radial-gradient(circle 26rem at 100% 0%, black 0%, transparent 100%);
  }

  .login-idara .panel {
    position: relative;
    width: 100%;
    max-width: 25rem;
  }

  .login-idara .wordmark {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-bottom: 2.25rem;
  }

  .login-idara .wordmark .icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 10px;
    background: var(--accent-cyan);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .login-idara .wordmark span {
    font-weight: 700;
    font-size: 1.2rem;
    letter-spacing: -0.01em;
    color: var(--text-white);
  }

  .login-idara .card {
    background: var(--bg-nav);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 2rem 2rem 2.25rem;
    box-shadow: 0 24px 60px -24px rgba(6, 16, 12, 0.65);
  }

  .login-idara .eyebrow {
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-cyan);
    margin: 0 0 0.5rem;
  }

  .login-idara h1 {
    font-weight: 700;
    font-size: 1.6rem;
    line-height: 1.2;
    color: var(--text-white);
    margin: 0 0 1.65rem;
  }

  .login-idara h1 em {
    font-style: normal;
    color: var(--text-mint);
  }

  .login-idara label {
    display: block;
    margin-bottom: 1.1rem;
  }

  .login-idara label span {
    display: block;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
  }

  .login-idara input {
    width: 100%;
    background: rgba(9, 22, 17, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    font-family: inherit;
    font-size: 0.92rem;
    color: var(--text-white);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .login-idara input::placeholder {
    color: rgba(246, 255, 245, 0.35);
  }

  .login-idara input:focus {
    outline: none;
    border-color: var(--accent-cyan);
    box-shadow: 0 0 0 3px rgba(144, 218, 230, 0.22);
  }

  .login-idara .error {
    background: rgba(255, 138, 128, 0.12);
    border: 1px solid rgba(255, 138, 128, 0.3);
    color: #FFC4BE;
    font-size: 0.82rem;
    line-height: 1.4;
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    margin: -0.15rem 0 1.1rem;
  }

  .login-idara button[type="submit"] {
    width: 100%;
    background: var(--accent-cyan);
    color: var(--bg-deep);
    font-family: inherit;
    font-weight: 600;
    font-size: 0.95rem;
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: filter 0.15s ease, transform 0.1s ease;
  }

  .login-idara button[type="submit"]:hover:not(:disabled) {
    filter: brightness(1.06);
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
    outline: 2px solid var(--accent-cyan);
    outline-offset: 2px;
  }

  .login-idara .trust {
    margin-top: 1.75rem;
    text-align: center;
    font-size: 0.74rem;
    color: var(--text-muted);
  }

  .login-idara .trust b {
    color: var(--text-white);
    font-weight: 600;
  }

  .login-idara .trust .dot {
    color: var(--accent-cyan);
    margin: 0 0.5rem;
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
      <div className="watermark" aria-hidden="true" />

      <div className="panel">
        <div className="wordmark">
          <span className="icon">
            <CreditCard size={18} strokeWidth={2.25} color="#112921" />
          </span>
          <span>ID Issuance</span>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <p className="eyebrow">Acceso</p>
          <h1>
            Inicia <em>sesión</em>
          </h1>

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

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={submitting || !username || !password}>
            {submitting ? "Ingresando…" : "Ingresar →"}
          </button>
        </form>

        <p className="trust">
          <b>HID</b> Fargo Connect Card Services<span className="dot">•</span>Construido por <b>RISI Technologies</b>
        </p>
      </div>
    </div>
  );
}
