export const SUBFIELDS = [
  { value: "ALGEBRA", label: "Algebra", short: "A" },
  { value: "COMBINATORICS", label: "Combinatorics", short: "C" },
  { value: "GEOMETRY", label: "Geometry", short: "G" },
  { value: "NUMBER_THEORY", label: "Number Theory", short: "N" },
] as const;

export type Subfield = (typeof SUBFIELDS)[number]["value"];

export function subfieldLabel(value: string) {
  return SUBFIELDS.find((s) => s.value === value)?.label ?? value;
}
export function subfieldShort(value: string) {
  return SUBFIELDS.find((s) => s.value === value)?.short ?? "?";
}

export const RATING_KINDS = ["NUMBER", "TOO_EASY", "TOO_HARD", "UNKNOWN"] as const;
export type RatingKind = (typeof RATING_KINDS)[number];

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "sv", label: "Swedish" },
  { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" },
  { code: "da", label: "Danish" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];
export function languageLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

/** Default contests for a new group, in roughly increasing order of difficulty. */
export const DEFAULT_CONTESTS: { name: string; numProblems: number }[] = [
  { name: "Höjdpunkten Högstadieklass", numProblems: 6 },
  { name: "EGMO-kval", numProblems: 6 },
  { name: "Höjdpunkten Gymnasieklass", numProblems: 6 },
  { name: "EGMO-TST", numProblems: 6 },
  { name: "Baltic Way", numProblems: 20 },
  { name: "Höjdpunkten Öppen klass", numProblems: 6 },
];

export const DEFAULT_FORMATTING = String.raw`\documentclass[a4paper,11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{graphicx}
\usepackage{geometry}
\geometry{margin=2.5cm}

% Images uploaded to this paper are exported next to this file with
% their original filenames, so \includegraphics{logo.png} works.

\title{<<CONTEST>>}
\date{}

\begin{document}
\maketitle

\begin{enumerate}
<<PROBLEMS>>
\end{enumerate}

\end{document}
`;

export const DEFAULT_PROBLEM_TEMPLATE = String.raw`\item <<STATEMENT>>
`;

export const DEFAULT_SOLUTION_TEMPLATE = String.raw`\item \textbf{<<NAME>>} (<<AUTHOR>>) <<SOLUTION>>
`;
