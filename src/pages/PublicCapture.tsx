import { CSSProperties, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Search } from "lucide-react";
import { ErrorBanner, Loading } from "../components/Feedback";
import GuidedFlowRunner from "../components/GuidedFlowRunner";
import { ApiError, publicFlowApi } from "../api/client";
import { darkenHex, hexToRgbTriplet } from "../lib/color";
import { resolveKioskTheme } from "../lib/kioskTheme";
import type { PublicFlow } from "../api/types";

// A kiosk is a shared device: after this long without a touch or key the
// person is asked whether they're still there, and if nobody answers within
// IDLE_GRACE_SECONDS the capture is wiped so the next person can't see it.
const IDLE_TIMEOUT_MS = 90_000;
const IDLE_GRACE_SECONDS = 20;
// After a successful submission the screen goes back to the start by itself.
const SUCCESS_RESET_SECONDS = 20;

const KIOSK_STYLES = `
  /* Brand band: the flow's color as a gradient into its darker tone, with the
     IDara diamond pattern as a faint watermark (BrandBook decorative motif). */
  .kiosk-band {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(90% 120% at 0% 0%, rgba(183, 238, 226, 0.14) 0%, transparent 60%),
      linear-gradient(160deg, rgb(var(--kiosk-brand-rgb)) 0%, rgb(var(--kiosk-brand-dim-rgb)) 100%);
  }
  .kiosk-band::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(45deg, rgba(244, 255, 244, 0.07) 0 1px, transparent 1px 34px),
      repeating-linear-gradient(-45deg, rgba(244, 255, 244, 0.07) 0 1px, transparent 1px 34px);
    -webkit-mask-image: radial-gradient(circle 26rem at 100% 0%, black 0%, transparent 100%);
    mask-image: radial-gradient(circle 26rem at 100% 0%, black 0%, transparent 100%);
  }
  .kiosk-band > * { position: relative; z-index: 1; }
`;

type Phase = "identify" | "capture" | "done";

export default function PublicCapture() {
  const { slug = "" } = useParams();
  const [flow, setFlow] = useState<PublicFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("identify");
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  // Bumped on every restart so the flow runner remounts with a clean state.
  const [session, setSession] = useState(0);

  // Kiosk identifier step (only shown when flow.identifierEnabled): asks
  // for an ID and looks up admin-uploaded preloaded data to pre-fill the
  // steps below, instead of the person retyping everything.
  const [personIdInput, setPersonIdInput] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [prefillValues, setPrefillValues] = useState<Record<string, string>>({});
  // Set only when the match came from an OPERATIONAL user's "Trabajos
  // pendientes" queue (not the admin's preloaded data) — sent back on submit
  // so that row is removed, same as when it's processed from the portal.
  const [pendingItemId, setPendingItemId] = useState<number | undefined>(undefined);

  const [idlePrompt, setIdlePrompt] = useState<number | null>(null);
  const [successCountdown, setSuccessCountdown] = useState(SUCCESS_RESET_SECONDS);

  useEffect(() => {
    setLoading(true);
    setError(null);
    publicFlowApi
      .getFlow(slug)
      .then((result) => {
        setFlow(result);
        setPhase(result.identifierEnabled ? "identify" : "capture");
      })
      .catch((err) => setError(err?.message ?? "Este enlace de captura no está disponible."))
      .finally(() => setLoading(false));
  }, [slug]);

  const restart = useCallback(() => {
    setPersonIdInput("");
    setIdentifyError(null);
    setPrefillValues({});
    setPendingItemId(undefined);
    setSubmittedJobId(null);
    setIdlePrompt(null);
    setSuccessCountdown(SUCCESS_RESET_SECONDS);
    setSession((s) => s + 1);
    setPhase(flow?.identifierEnabled ? "identify" : "capture");
    window.scrollTo({ top: 0 });
  }, [flow]);

  // Inactivity watch: only while someone has started entering data.
  const hasProgress = phase === "capture" || (phase === "identify" && personIdInput !== "");
  useEffect(() => {
    if (!hasProgress || idlePrompt !== null) return;
    let timer = window.setTimeout(() => setIdlePrompt(IDLE_GRACE_SECONDS), IDLE_TIMEOUT_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdlePrompt(IDLE_GRACE_SECONDS), IDLE_TIMEOUT_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [hasProgress, idlePrompt]);

  useEffect(() => {
    if (idlePrompt === null) return;
    if (idlePrompt === 0) {
      restart();
      return;
    }
    const timer = window.setTimeout(() => setIdlePrompt((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [idlePrompt, restart]);

  useEffect(() => {
    if (phase !== "done") return;
    if (successCountdown === 0) {
      restart();
      return;
    }
    const timer = window.setTimeout(() => setSuccessCountdown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, successCountdown, restart]);

  async function handleIdentify() {
    if (!personIdInput.trim()) return;
    setIdentifying(true);
    setIdentifyError(null);
    try {
      const result = await publicFlowApi.getPreloadedData(slug, personIdInput.trim());
      setPrefillValues(result.values);
      setPendingItemId(result.pendingItemId ?? undefined);
      setPhase("capture");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIdentifyError(
          "No encontramos datos con ese identificador. Revisa que esté bien escrito, o continúa y llena tus datos tú mismo.",
        );
      } else {
        setIdentifyError((err as any)?.message ?? "No se pudo buscar tus datos. Inténtalo de nuevo.");
      }
    } finally {
      setIdentifying(false);
    }
  }

  function continueWithoutPrefill() {
    setPrefillValues({});
    setPendingItemId(undefined);
    setIdentifyError(null);
    setPhase("capture");
  }

  const { primaryColor, backgroundColor } = resolveKioskTheme(flow?.theme);

  // These CSS variables only exist within this screen's own subtree — the
  // authenticated dashboard never sets them, so it keeps its own brand look.
  const themeStyle: CSSProperties = {
    ["--kiosk-bg-rgb" as any]: hexToRgbTriplet(backgroundColor) ?? undefined,
    ["--kiosk-brand-rgb" as any]: hexToRgbTriplet(primaryColor) ?? undefined,
    ["--kiosk-brand-dim-rgb" as any]: hexToRgbTriplet(darkenHex(primaryColor, 0.55)) ?? undefined,
  };

  const kioskPrimary =
    "inline-flex items-center justify-center gap-2 bg-brand text-white font-display font-semibold px-7 py-3.5 rounded-full hover:bg-brand-dim transition-colors text-base disabled:opacity-50";

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={themeStyle}>
      <style>{KIOSK_STYLES}</style>

      <header className="kiosk-band text-shell-text px-4 pt-8 pb-24 sm:pt-10 sm:pb-28">
        <div className="mx-auto w-full max-w-xl flex flex-col items-center text-center gap-4">
          {flow?.theme?.logoText ? (
            <span className="font-display font-bold tracking-tight text-2xl sm:text-3xl text-white">
              {flow.theme.logoText}
            </span>
          ) : (
            // Official ID Issuance lockup in white (ratio 3.75:1, width only).
            <img src="/brand/idara-issuance-white.svg" alt="ID Issuance" className="w-[190px] sm:w-[220px] h-auto" />
          )}
          {flow && (
            <p className="font-display text-sm sm:text-base font-medium text-shell-mint">{flow.name}</p>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 -mt-16 sm:-mt-20 pb-10">
        <div className="mx-auto w-full max-w-xl stub rounded-2xl shadow-xl shadow-black/5 p-6 sm:p-9">
          {loading && <Loading label="Cargando" />}
          {error && <ErrorBanner message={error} />}

          {!loading && !error && flow && phase === "identify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleIdentify();
              }}
            >
              <p className="data-label mb-2">Bienvenido</p>
              <h1 className="font-display text-2xl sm:text-[1.75rem] leading-tight font-bold text-ink mb-2">
                {flow.identifierLabel ? `Escribe tu ${flow.identifierLabel.toLowerCase()}` : "Escribe tu identificador"}
              </h1>
              <p className="text-muted text-base mb-6">
                Con él buscamos tus datos para llenar el formulario por ti. Solo tendrás que revisarlos y tomarte la foto.
              </p>
              <label className="block mb-5">
                <span className="block text-sm font-medium text-ink mb-1.5">
                  {flow.identifierLabel || "Identificador"}
                </span>
                <input
                  value={personIdInput}
                  onChange={(e) => setPersonIdInput(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="input w-full text-lg px-4 py-3.5 font-mono tracking-wide"
                />
              </label>
              {identifyError && (
                <div className="mb-5">
                  <ErrorBanner message={identifyError} />
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button type="submit" disabled={identifying || !personIdInput.trim()} className={kioskPrimary}>
                  <Search size={18} />
                  {identifying ? "Buscando tus datos…" : "Buscar mis datos"}
                </button>
                <button
                  type="button"
                  onClick={continueWithoutPrefill}
                  className="text-muted hover:text-ink text-sm font-medium py-2 transition-colors"
                >
                  No tengo identificador, llenar mis datos
                </button>
              </div>
            </form>
          )}

          {!loading && !error && flow && phase === "capture" && (
            <GuidedFlowRunner
              key={session}
              variant="kiosk"
              steps={flow.steps}
              requestNameField={flow.requestNameField}
              fetchTemplate={() => publicFlowApi.getTemplate(slug)}
              submitJob={(template) => publicFlowApi.submitJob(slug, template, pendingItemId)}
              onBack={flow.identifierEnabled ? restart : undefined}
              onSubmitted={(jobId) => {
                setSubmittedJobId(jobId);
                setSuccessCountdown(SUCCESS_RESET_SECONDS);
                setPhase("done");
              }}
              initialValues={prefillValues}
            />
          )}

          {phase === "done" && (
            <div className="text-center py-4" role="status">
              <CheckCircle2 size={56} strokeWidth={1.75} className="text-success mx-auto mb-4" />
              <h1 className="font-display text-2xl sm:text-[1.75rem] leading-tight font-bold text-ink mb-2">
                ¡Listo! Recibimos tu solicitud
              </h1>
              <p className="text-muted text-base mb-6 max-w-sm mx-auto">
                Tu credencial ya está en la fila de impresión. Guarda tu folio por si necesitas dar seguimiento.
              </p>
              {submittedJobId && (
                <div className="field-box inline-block text-left mb-7">
                  <p className="field-label">Folio de tu solicitud</p>
                  <p className="field-value font-mono text-base break-all">{submittedJobId}</p>
                </div>
              )}
              <div>
                <button onClick={restart} className={kioskPrimary}>
                  Nueva captura
                </button>
                <p className="text-muted text-xs mt-3">
                  Esta pantalla se reiniciará en {successCountdown} s para la siguiente persona.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="px-4 pb-8 flex flex-col items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          Ecosistema
          <img src="/brand/idara-horizontal-color.svg" alt="IDara" className="w-[100px] h-auto" />
        </span>
        <span>Where identity simplifies access</span>
      </footer>

      {idlePrompt !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-shell-deep/60 px-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-title"
        >
          <div className="stub rounded-2xl w-full max-w-sm p-7 text-center shadow-xl">
            <h2 id="idle-title" className="font-display text-xl font-bold text-ink mb-2">
              ¿Sigues ahí?
            </h2>
            <p className="text-muted text-base mb-6">
              Por tu privacidad, borraremos lo que capturaste en <b className="text-ink">{idlePrompt} s</b>.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setIdlePrompt(null)} className={kioskPrimary} autoFocus>
                Sí, continuar
              </button>
              <button onClick={restart} className="text-muted hover:text-ink text-sm font-medium py-2">
                Empezar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
