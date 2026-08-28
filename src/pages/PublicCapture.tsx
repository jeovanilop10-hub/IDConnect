import { CSSProperties, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorBanner, Loading } from "../components/Feedback";
import GuidedFlowRunner from "../components/GuidedFlowRunner";
import { ApiError, publicFlowApi } from "../api/client";
import { darkenHex, hexToRgbTriplet } from "../lib/color";
import type { PublicFlow } from "../api/types";

// The "ID Connect" kiosk brand — applied by default to every public capture
// screen, independently of whichever flow is loaded. A flow's own theme
// (set in the flow builder) overrides these on top, per-flow.
const KIOSK_DEFAULT_PRIMARY = "#2E4A46";
const KIOSK_DEFAULT_BG = "#F2F6F5";

export default function PublicCapture() {
  const { slug = "" } = useParams();
  const [flow, setFlow] = useState<PublicFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  // Kiosk identifier step (only shown when flow.identifierEnabled): asks
  // for an ID and looks up admin-uploaded preloaded data to pre-fill the
  // steps below, instead of the person retyping everything.
  const [identified, setIdentified] = useState(false);
  const [personIdInput, setPersonIdInput] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [prefillValues, setPrefillValues] = useState<Record<string, string>>({});
  // Set only when the match came from an OPERATIONAL user's "Trabajos
  // pendientes" queue (not the admin's preloaded data) — sent back on submit
  // so that row is removed, same as when it's processed from the portal.
  const [pendingItemId, setPendingItemId] = useState<number | undefined>(undefined);

  async function handleIdentify() {
    if (!personIdInput.trim()) return;
    setIdentifying(true);
    setIdentifyError(null);
    try {
      const result = await publicFlowApi.getPreloadedData(slug, personIdInput.trim());
      setPrefillValues(result.values);
      setPendingItemId(result.pendingItemId ?? undefined);
      setIdentified(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIdentifyError("No encontramos datos precargados para ese identificador. Puedes continuar y llenar todo manualmente.");
      } else {
        setIdentifyError((err as any)?.message ?? "No se pudo buscar tus datos.");
      }
    } finally {
      setIdentifying(false);
    }
  }

  function continueWithoutPrefill() {
    setPrefillValues({});
    setPendingItemId(undefined);
    setIdentified(true);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    publicFlowApi
      .getFlow(slug)
      .then(setFlow)
      .catch((err) => setError(err?.message ?? "Este enlace de captura no está disponible."))
      .finally(() => setLoading(false));
  }, [slug]);

  const theme = flow?.theme;
  const primaryColor = theme?.primaryColor || KIOSK_DEFAULT_PRIMARY;
  const backgroundColor = theme?.backgroundColor || KIOSK_DEFAULT_BG;

  // These CSS variables only exist within this screen's own subtree — the
  // authenticated dashboard never sets them, so it keeps its own brand look.
  const themeStyle: CSSProperties = {
    ["--kiosk-bg-rgb" as any]: hexToRgbTriplet(backgroundColor) ?? undefined,
    ["--kiosk-brand-rgb" as any]: hexToRgbTriplet(primaryColor) ?? undefined,
    ["--kiosk-brand-dim-rgb" as any]: hexToRgbTriplet(darkenHex(primaryColor)) ?? undefined,
  };

  return (
    <div
      className="min-h-screen bg-bg flex flex-col items-center px-4 py-10 sm:py-14"
      style={themeStyle}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          background: `radial-gradient(circle at 15% 10%, rgb(var(--kiosk-brand-rgb)), transparent 45%), radial-gradient(circle at 85% 90%, rgb(var(--kiosk-brand-rgb)), transparent 45%)`,
        }}
      />

      <div className="relative flex flex-col items-center mb-8">
        {theme?.logoText ? (
          <span className="font-display font-bold tracking-tight text-2xl" style={{ color: primaryColor }}>
            {theme.logoText}
          </span>
        ) : (
          // The logo is a flat PNG (colors baked into the pixels), so a
          // Tailwind color class can't recolor it. Using it as a CSS mask
          // instead lets us fill its exact silhouette with each flow's own
          // primary color, so the logo's color genuinely follows the
          // configured palette rather than an approximate filter.
          <div
            role="img"
            aria-label="ID Connect"
            className="h-10 sm:h-12 w-auto"
            style={
              {
                aspectRatio: "590 / 138",
                backgroundColor: primaryColor,
                WebkitMaskImage: "url(/id-connect-logo-mask.png)",
                maskImage: "url(/id-connect-logo-mask.png)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              } as CSSProperties
            }
          />
        )}
      </div>

      <div className="relative w-full max-w-lg stub p-6 sm:p-8 rounded-2xl shadow-xl shadow-black/5">
        {loading && <Loading label="Cargando" />}
        {error && <ErrorBanner message={error} />}

        {!loading && !error && flow && flow.identifierEnabled && !identified && !submittedJobId && (
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">
              {flow.identifierLabel || "Ingresa tu identificador"}
            </h2>
            <p className="text-muted text-sm mb-5">
              Buscamos tus datos para llenar algunos campos automáticamente.
            </p>
            <input
              value={personIdInput}
              onChange={(e) => setPersonIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIdentify()}
              placeholder={flow.identifierLabel || "Identificador"}
              autoFocus
              className="input w-full mb-4"
            />
            {identifyError && (
              <div className="mb-4">
                <ErrorBanner message={identifyError} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleIdentify}
                disabled={identifying || !personIdInput.trim()}
                className="bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dim transition-colors text-sm disabled:opacity-50 shadow-sm"
              >
                {identifying ? "Buscando…" : "Continuar"}
              </button>
              <button
                onClick={continueWithoutPrefill}
                className="text-muted hover:text-ink text-xs transition-colors"
              >
                Continuar sin datos precargados
              </button>
            </div>
          </div>
        )}

        {!loading && !error && flow && (!flow.identifierEnabled || identified) && !submittedJobId && (
          <GuidedFlowRunner
            steps={flow.steps}
            requestNameField={flow.requestNameField}
            fetchTemplate={() => publicFlowApi.getTemplate(slug)}
            submitJob={(template) => publicFlowApi.submitJob(slug, template, pendingItemId)}
            onBack={() => window.history.back()}
            onSubmitted={(jobId) => setSubmittedJobId(jobId)}
            initialValues={prefillValues}
          />
        )}

        {submittedJobId && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-success text-2xl">✓</span>
            </div>
            <p className="text-ink font-semibold text-lg mb-2">Solicitud enviada correctamente</p>
            <p className="text-muted text-sm">
              Tu tarjeta está en proceso de impresión. Puedes cerrar esta ventana.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
