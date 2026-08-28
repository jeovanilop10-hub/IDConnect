import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <span className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <CreditCard size={18} strokeWidth={2} className="text-white" />
          </span>
          <span className="font-display font-bold tracking-tight text-xl text-ink">ID Issuance</span>
        </div>

        <form onSubmit={handleSubmit} className="stub p-6 space-y-4">
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-1">Acceso</p>
            <h1 className="font-display text-xl font-semibold">Iniciar sesión</h1>
          </div>

          <label className="block">
            <span className="block text-xs text-muted mb-1">Usuario</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="input w-full"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="block text-xs text-muted mb-1">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors disabled:opacity-50"
          >
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
