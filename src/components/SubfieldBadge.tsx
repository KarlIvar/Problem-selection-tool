import { subfieldLabel } from "@/lib/constants";

const colors: Record<string, string> = {
  ALGEBRA: "bg-blue-100 text-blue-800",
  COMBINATORICS: "bg-amber-100 text-amber-800",
  GEOMETRY: "bg-emerald-100 text-emerald-800",
  NUMBER_THEORY: "bg-purple-100 text-purple-800",
};

export function SubfieldBadge({ value, short = false }: { value: string; short?: boolean }) {
  const label = subfieldLabel(value);
  return (
    <span className={`badge ${colors[value] ?? "bg-slate-100 text-slate-700"}`} title={label}>
      {short ? label[0] : label}
    </span>
  );
}
