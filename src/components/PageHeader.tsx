import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-muted text-xs mb-3">{eyebrow}</p>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-2 min-w-0">
          {back && (
            <Link
              to={back}
              className="mt-1 text-muted hover:text-ink transition-colors shrink-0"
              aria-label="Volver"
            >
              <ChevronLeft size={22} />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">{title}</h1>
            {description && <p className="text-muted text-sm mt-2 max-w-xl">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
