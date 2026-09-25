import { renderLatex } from "@/lib/latex";

export function Latex({ children, className = "" }: { children: string; className?: string }) {
  return <div className={`latex leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: renderLatex(children) }} />;
}
