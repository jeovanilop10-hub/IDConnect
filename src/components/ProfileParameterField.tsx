import type { ProductionProfileParameter } from "../api/types";

export default function ProfileParameterField({
  parameter,
  value,
  onChange,
}: {
  parameter: ProductionProfileParameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = (
    <span className="block mb-1 text-sm">
      {parameter.name ?? "parámetro"}
      {parameter.required && <span className="text-brand ml-1">*</span>}
      <span className="text-muted text-xs font-mono ml-2">{parameter.dataType ?? "Text"}</span>
    </span>
  );

  if (parameter.dataType === "Image") {
    return (
      <label className="block">
        {label}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1] ?? result;
              onChange(base64);
            };
            reader.readAsDataURL(file);
          }}
          className="block w-full text-sm text-muted"
        />
        {value && <p className="text-xs text-success mt-1">Imagen cargada ({Math.round(value.length / 1024)} KB en base64)</p>}
      </label>
    );
  }

  if (parameter.dataType === "List" && parameter.options && parameter.options.length > 0) {
    return (
      <label className="block">
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-full">
          <option value="">(selecciona)</option>
          {parameter.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (parameter.dataType === "Date") {
    return (
      <label className="block">
        {label}
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="input w-full" />
      </label>
    );
  }

  if (parameter.dataType === "Integer") {
    return (
      <label className="block">
        {label}
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="input w-full" />
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="input w-full" />
    </label>
  );
}
