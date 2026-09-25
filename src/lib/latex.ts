import katex from "katex";

/**
 * A small LaTeX-to-HTML renderer for problem statements and solutions.
 * Math ($...$, $$...$$, \(...\), \[...\], align/equation environments) is rendered with KaTeX.
 * A practical subset of text-mode LaTeX is supported (bold/italic, lists, line breaks, paragraphs).
 * Anything unknown is shown verbatim so nothing silently disappears.
 */

const MATH_ENVS = ["align", "align*", "equation", "equation*", "gather", "gather*", "alignat", "alignat*", "multline", "multline*", "eqnarray", "eqnarray*", "CD"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function math(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
  } catch (e) {
    return `<span class="text-red-600">${esc(String(e))}</span>`;
  }
}

/** Index of the brace matching the "{" at position i, or -1. */
function matchBrace(s: string, i: number): number {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Find the closing delimiter, skipping escaped characters. */
function findClose(s: string, from: number, close: string): number {
  for (let j = from; j <= s.length - close.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s.startsWith(close, j)) return j;
  }
  return -1;
}

const TEXT_COMMANDS: Record<string, (inner: string) => string> = {
  textbf: (x) => `<strong>${x}</strong>`,
  textit: (x) => `<em>${x}</em>`,
  emph: (x) => `<em>${x}</em>`,
  underline: (x) => `<u>${x}</u>`,
  texttt: (x) => `<code>${x}</code>`,
  textsc: (x) => `<span style="font-variant: small-caps">${x}</span>`,
  text: (x) => x,
  mbox: (x) => `<span class="whitespace-nowrap">${x}</span>`,
  section: (x) => `<h3 class="text-lg font-semibold mt-3 mb-1">${x}</h3>`,
  subsection: (x) => `<h4 class="font-semibold mt-2 mb-1">${x}</h4>`,
  "section*": (x) => `<h3 class="text-lg font-semibold mt-3 mb-1">${x}</h3>`,
  "subsection*": (x) => `<h4 class="font-semibold mt-2 mb-1">${x}</h4>`,
  textsuperscript: (x) => `<sup>${x}</sup>`,
  textsubscript: (x) => `<sub>${x}</sub>`,
};

const SIMPLE_COMMANDS: Record<string, string> = {
  ldots: "…",
  dots: "…",
  textbackslash: "\\",
  quad: "&emsp;",
  qquad: "&emsp;&emsp;",
  noindent: "",
  bigskip: '<span class="block h-4"></span>',
  medskip: '<span class="block h-3"></span>',
  smallskip: '<span class="block h-2"></span>',
  newline: "<br>",
  par: '<span class="block h-3"></span>',
  centering: "",
  hfill: '<span class="inline-block flex-1"></span>',
  aa: "å",
  AA: "Å",
  o: "ø",
  O: "Ø",
  ss: "ß",
  LaTeX: "LaTeX",
  TeX: "TeX",
};

function stripComments(src: string): string {
  return src.replace(/(^|[^\\])%[^\n]*/g, "$1");
}

function walk(s: string): string {
  let out = "";
  let i = 0;
  const listStack: { tag: string; open: boolean }[] = [];

  const closeItem = () => {
    const top = listStack[listStack.length - 1];
    if (top && top.open) {
      out += "</li>";
      top.open = false;
    }
  };

  while (i < s.length) {
    const c = s[i];

    // Display math $$...$$
    if (s.startsWith("$$", i)) {
      const end = findClose(s, i + 2, "$$");
      if (end !== -1) {
        out += math(s.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    // Inline math $...$
    if (c === "$") {
      const end = findClose(s, i + 1, "$");
      if (end !== -1) {
        out += math(s.slice(i + 1, end), false);
        i = end + 1;
        continue;
      }
    }
    if (c === "\\") {
      const rest = s.slice(i);
      // \[ ... \]
      if (rest.startsWith("\\[")) {
        const end = findClose(s, i + 2, "\\]");
        if (end !== -1) {
          out += math(s.slice(i + 2, end), true);
          i = end + 2;
          continue;
        }
      }
      // \( ... \)
      if (rest.startsWith("\\(")) {
        const end = findClose(s, i + 2, "\\)");
        if (end !== -1) {
          out += math(s.slice(i + 2, end), false);
          i = end + 2;
          continue;
        }
      }
      // Line break \\ or \\[len]
      if (rest.startsWith("\\\\")) {
        i += 2;
        const m = /^\[[^\]]*\]/.exec(s.slice(i));
        if (m) i += m[0].length;
        out += "<br>";
        continue;
      }
      // Escaped specials
      const special = rest[1];
      if (special !== undefined && "%&_#$}{ ,;!".includes(special)) {
        if (special === " " || special === ",") out += " ";
        else if (special === ";" || special === "!") out += "";
        else out += esc(special);
        i += 2;
        continue;
      }
      if (special === "~") {
        const m = /^\\~\{?(.)\}?/.exec(rest);
        if (m) {
          out += esc(m[1]) + "̃";
          i += m[0].length;
          continue;
        }
      }
      if (special === '"' || special === "'" || special === "`" || special === "^") {
        const m = /^\\(["'`^])\{?([A-Za-z])\}?/.exec(rest);
        if (m) {
          const accents: Record<string, string> = { '"': "̈", "'": "́", "`": "̀", "^": "̂" };
          out += esc(m[2]) + accents[m[1]];
          i += m[0].length;
          continue;
        }
      }
      // \begin{env} / \end{env}
      const bm = /^\\(begin|end)\{([a-zA-Z*]+)\}/.exec(rest);
      if (bm) {
        const kind = bm[1];
        const env = bm[2];
        if (kind === "begin" && MATH_ENVS.includes(env)) {
          const endTag = `\\end{${env}}`;
          const end = s.indexOf(endTag, i);
          if (end !== -1) {
            out += math(s.slice(i, end + endTag.length), true);
            i = end + endTag.length;
            continue;
          }
        }
        if (env === "enumerate" || env === "itemize") {
          const tag = env === "enumerate" ? "ol" : "ul";
          if (kind === "begin") {
            i += bm[0].length;
            // optional [label=...] argument, ignored
            const opt = /^\s*\[[^\]]*\]/.exec(s.slice(i));
            if (opt) i += opt[0].length;
            closeItem();
            listStack.push({ tag, open: false });
            out += tag === "ol" ? '<ol class="list-decimal pl-6 my-1 space-y-1">' : '<ul class="list-disc pl-6 my-1 space-y-1">';
          } else {
            closeItem();
            const top = listStack.pop();
            out += `</${top?.tag ?? tag}>`;
            i += bm[0].length;
          }
          continue;
        }
        if (env === "center") {
          out += kind === "begin" ? '<div class="text-center">' : "</div>";
          i += bm[0].length;
          continue;
        }
        if (env === "proof" || env === "solution") {
          out += kind === "begin" ? '<div class="my-1"><em>Proof.</em> ' : ' <span class="float-right">∎</span></div>';
          i += bm[0].length;
          continue;
        }
        if (env === "quote" || env === "quotation") {
          out += kind === "begin" ? '<blockquote class="border-l-2 pl-3 my-1">' : "</blockquote>";
          i += bm[0].length;
          continue;
        }
        if (env === "figure" || env === "figure*" || env === "minipage" || env === "flushleft" || env === "flushright") {
          out += kind === "begin" ? "<div>" : "</div>";
          i += bm[0].length;
          const opt = /^\s*(\[[^\]]*\]|\{[^}]*\})/.exec(s.slice(i));
          if (kind === "begin" && opt) i += opt[0].length;
          continue;
        }
        // unknown environment: drop the tags, keep contents
        i += bm[0].length;
        continue;
      }
      // \item or \item[label]
      if (/^\\item\b/.test(rest)) {
        i += 5;
        const lm = /^\[([^\]]*)\]/.exec(s.slice(i));
        let label = "";
        if (lm) {
          label = walk(lm[1]);
          i += lm[0].length;
        }
        if (listStack.length === 0) {
          listStack.push({ tag: "ul", open: false });
          out += '<ul class="list-disc pl-6 my-1 space-y-1">';
        }
        closeItem();
        const top = listStack[listStack.length - 1];
        top.open = true;
        out += label ? `<li class="list-none -ml-6"><span class="inline-block w-6">${label}</span>` : "<li>";
        continue;
      }
      // \includegraphics[...]{file}
      const ig = /^\\includegraphics(\[[^\]]*\])?\{([^}]*)\}/.exec(rest);
      if (ig) {
        out += `<span class="text-xs text-gray-500 border rounded px-1">[image: ${esc(ig[2])}]</span>`;
        i += ig[0].length;
        continue;
      }
      // \label / \ref / \vspace / \hspace: ignore with argument
      const ignore = /^\\(label|vspace\*?|hspace\*?|setlength|newcommand|renewcommand|usepackage|pagebreak|newpage|clearpage|setcounter|footnote)(\[[^\]]*\])?(\{)/.exec(rest);
      if (ignore) {
        const bi = i + ignore[0].length - 1;
        const close = matchBrace(s, bi);
        if (close !== -1) {
          if (ignore[1] === "footnote") out += `<sup class="text-xs">[${walk(s.slice(bi + 1, close))}]</sup>`;
          i = close + 1;
          continue;
        }
      }
      // \cmd{arg}
      const cm = /^\\([a-zA-Z]+\*?)\s*\{/.exec(rest);
      if (cm && TEXT_COMMANDS[cm[1]]) {
        const bi = i + cm[0].length - 1;
        const close = matchBrace(s, bi);
        if (close !== -1) {
          out += TEXT_COMMANDS[cm[1]](walk(s.slice(bi + 1, close)));
          i = close + 1;
          continue;
        }
      }
      // simple commands
      const sm = /^\\([a-zA-Z]+)/.exec(rest);
      if (sm && SIMPLE_COMMANDS[sm[1]] !== undefined) {
        out += SIMPLE_COMMANDS[sm[1]];
        i += sm[0].length;
        // swallow one following space (TeX behaviour)
        if (s[i] === " " && SIMPLE_COMMANDS[sm[1]] !== "") i++;
        continue;
      }
      // unknown command: output verbatim
      if (sm) {
        out += `<span class="text-gray-500">${esc(sm[0])}</span>`;
        i += sm[0].length;
        continue;
      }
      out += esc(c);
      i++;
      continue;
    }
    // Braces used for grouping in text mode: drop them
    if (c === "{") {
      const close = matchBrace(s, i);
      if (close !== -1) {
        out += walk(s.slice(i + 1, close));
        i = close + 1;
        continue;
      }
    }
    if (c === "}") {
      i++;
      continue;
    }
    // Paragraph breaks
    if (c === "\n") {
      const m = /^\n[ \t]*\n[\s]*/.exec(s.slice(i));
      if (m) {
        out += '<span class="block h-3"></span>';
        i += m[0].length;
        continue;
      }
      out += " ";
      i++;
      continue;
    }
    if (c === "~") {
      out += "&nbsp;";
      i++;
      continue;
    }
    if (s.startsWith("---", i)) {
      out += "—";
      i += 3;
      continue;
    }
    if (s.startsWith("--", i)) {
      out += "–";
      i += 2;
      continue;
    }
    if (s.startsWith("``", i)) {
      out += "“";
      i += 2;
      continue;
    }
    if (s.startsWith("''", i)) {
      out += "”";
      i += 2;
      continue;
    }
    if (c === "`") {
      out += "‘";
      i++;
      continue;
    }
    out += esc(c);
    i++;
  }
  // close anything left open
  while (listStack.length) {
    closeItem();
    const top = listStack.pop()!;
    out += `</${top.tag}>`;
  }
  return out;
}

export function renderLatex(src: string): string {
  if (!src) return "";
  return walk(stripComments(src.replace(/\r\n/g, "\n")));
}
