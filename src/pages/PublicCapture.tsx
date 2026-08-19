import { CSSProperties, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorBanner, Loading } from "../components/Feedback";
import GuidedFlowRunner from "../components/GuidedFlowRunner";
import { publicFlowApi } from "../api/client";
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

        {!loading && !error && flow && !submittedJobId && (
          <GuidedFlowRunner
            steps={flow.steps}
            requestNameField={flow.requestNameField}
            fetchTemplate={() => publicFlowApi.getTemplate(slug)}
            submitJob={(template) => publicFlowApi.submitJob(slug, template)}
            onBack={() => window.history.back()}
            onSubmitted={(jobId) => setSubmittedJobId(jobId)}
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
