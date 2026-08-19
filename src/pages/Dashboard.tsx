import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";

const CARDS = [
  {
    to: "/organizaciones",
    label: "Organizaciones",
    desc: "Unidades organizacionales y ubicaciones registradas en Fargo Connect.",
  },
  {
    to: "/dispositivos",
    label: "Dispositivos",
    desc: "Impresoras y destinos de impresión disponibles, con sus certificados públicos.",
  },
  {
    to: "/perfiles",
    label: "Perfiles de producción",
    desc: "Plantillas de emisión de tarjetas y sus parámetros configurables.",
  },
  {
    to: "/trabajos",
    label: "Trabajos",
    desc: "Historial de trabajos de impresión por periodo o rango de fechas.",
  },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        eyebrow="Fargo Connect · HID Card Services"
        title="Panel de emisión de tarjetas"
        description="Flujo completo: selecciona una organización, configura un perfil de producción, envía el trabajo a la impresora y monitorea su estado."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="stub p-5 hover:border-brand/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              <span className="font-display font-semibold group-hover:text-brand transition-colors">
                {c.label}
              </span>
            </div>
            <p className="text-muted text-sm pl-5">{c.desc}</p>
          </Link>
        ))}
      </div>

      <div className="stub p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-semibold mb-1">¿Listo para emitir una tarjeta?</p>
          <p className="text-muted text-sm">
            El asistente te guía: organización → perfil → parámetros → envío.
          </p>
        </div>
        <Link
          to="/nuevo-trabajo"
          className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors shrink-0"
        >
          Iniciar nuevo trabajo →
        </Link>
      </div>
    </div>
  );
}
