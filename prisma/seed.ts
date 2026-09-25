/**
 * Optional demo data. Run with: npm run seed
 * Adds a demo group with two users (alice@example.com / bob@example.com, password "demo1234")
 * and a handful of problems. Safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CONTESTS = [
  { name: "Höjdpunkten Högstadieklass", numProblems: 6 },
  { name: "EGMO-kval", numProblems: 6 },
  { name: "Höjdpunkten Gymnasieklass", numProblems: 6 },
  { name: "EGMO-TST", numProblems: 6 },
  { name: "Baltic Way", numProblems: 20 },
  { name: "Höjdpunkten Öppen klass", numProblems: 6 },
];

const PROBLEMS = [
  {
    name: "Sum of squares",
    subfield: "NUMBER_THEORY",
    statement: String.raw`Find all positive integers $n$ such that $n^2 + 1$ divides $n^4 + 1$.`,
    solution: String.raw`Since $n^4 + 1 = (n^2+1)(n^2-1) + 2$, we need $n^2 + 1 \mid 2$, so $n = 1$.`,
  },
  {
    name: "Chessboard colouring",
    subfield: "COMBINATORICS",
    statement: String.raw`Each cell of an $8 \times 8$ board is coloured black or white. A move consists of choosing a row or a column and inverting all its colours. Show that one can always reach a colouring with at most $8$ black cells.

\begin{enumerate}
\item Prove the claim.
\item Is $8$ optimal?
\end{enumerate}`,
    solution: String.raw`Flip each row so that it has at most $4$ black cells, then flip each column with more than $4$ black cells. \textbf{Second part:} the diagonal colouring shows $8$ cannot be improved.`,
  },
  {
    name: "Tangent circles",
    subfield: "GEOMETRY",
    statement: String.raw`Let $\omega_1$ and $\omega_2$ be circles intersecting at $A$ and $B$. A line through $A$ meets $\omega_1$ again at $C$ and $\omega_2$ again at $D$. Prove that the tangent to $\omega_1$ at $C$ and the tangent to $\omega_2$ at $D$ meet on the circumcircle of $BCD$.`,
    solution: String.raw`Let the tangents meet at $P$. By the tangent--chord angle, $\angle PCB = \angle CAB$ and $\angle PDB = \angle DAB$, so
\[ \angle CPD = 180^\circ - \angle PCD - \angle PDC = \angle CBD, \]
which gives the result.`,
  },
  {
    name: "Functional inequality",
    subfield: "ALGEBRA",
    statement: String.raw`Find all functions $f\colon \mathbb{R} \to \mathbb{R}$ such that
$$f(x+y) + f(x-y) \ge 2f(x)$$
for all real $x, y$, and $f(0) = 0$, $f(1) = 1$.`,
    solution: String.raw`Setting $y = x$ gives $f(2x) \ge 2f(x)$; the condition says $f$ is midpoint convex. Together with boundedness on an interval one gets $f(x) = x$ --- but as stated, there are pathological solutions too, so the problem needs an extra regularity condition.`,
  },
  {
    name: "Prime gaps",
    subfield: "NUMBER_THEORY",
    statement: String.raw`Prove that for every positive integer $k$ there exist $k$ consecutive positive integers none of which is prime.`,
    solution: String.raw`Take $(k+1)! + 2, \ldots, (k+1)! + (k+1)$.`,
  },
  {
    name: "Inequality with three variables",
    subfield: "ALGEBRA",
    statement: String.raw`Let $a, b, c > 0$ with $abc = 1$. Prove that
\[ \frac{1}{a^3(b+c)} + \frac{1}{b^3(c+a)} + \frac{1}{c^3(a+b)} \ge \frac{3}{2}. \]`,
    solution: String.raw`Substitute $x = 1/a$ etc. and apply Cauchy--Schwarz followed by AM--GM.`,
  },
];

async function main() {
  const hash = await bcrypt.hash("demo1234", 10);
  const alice = await prisma.user.upsert({ where: { email: "alice@example.com" }, update: {}, create: { name: "Alice Demo", email: "alice@example.com", passwordHash: hash } });
  const bob = await prisma.user.upsert({ where: { email: "bob@example.com" }, update: {}, create: { name: "Bob Demo", email: "bob@example.com", passwordHash: hash } });

  let group = await prisma.group.findFirst({ where: { name: "Demo Problem Group" } });
  if (!group) {
    group = await prisma.group.create({ data: { name: "Demo Problem Group", inviteCode: "DEMO2026" } });
    await prisma.contest.createMany({
      data: DEFAULT_CONTESTS.map((c, i) => ({ groupId: group!.id, name: c.name, position: i, numProblems: c.numProblems, formatting: FORMATTING, problemTemplate: String.raw`\item <<STATEMENT>>` + "\n", solutionTemplate: String.raw`\item \textbf{<<NAME>>} (<<AUTHOR>>) <<SOLUTION>>` + "\n" })),
    });
  }
  for (const [u, role] of [[alice, "ADMIN"], [bob, "MEMBER"]] as const) {
    await prisma.membership.upsert({ where: { userId_groupId: { userId: u.id, groupId: group.id } }, update: {}, create: { userId: u.id, groupId: group.id, role } });
  }
  const contests = await prisma.contest.findMany({ where: { groupId: group.id }, orderBy: { position: "asc" } });
  const existing = await prisma.problem.count({ where: { groupId: group.id } });
  if (existing === 0) {
    for (const [i, p] of PROBLEMS.entries()) {
      const author = i % 2 ? bob : alice;
      const problem = await prisma.problem.create({
        data: { groupId: group.id, ...p, authorId: author.id, createdById: author.id, comments: { create: { authorId: author.id, isEvent: true, body: "created the problem" } } },
      });
      const other = author.id === alice.id ? bob : alice;
      await prisma.solve.create({ data: { userId: other.id, problemId: problem.id } });
      await prisma.rating.create({ data: { userId: other.id, problemId: problem.id, contestId: contests[i % contests.length].id, kind: "NUMBER", number: 1 + (i % 4) } });
      await prisma.rating.create({ data: { userId: other.id, problemId: problem.id, contestId: contests[(i + 1) % contests.length].id, kind: i % 3 === 0 ? "TOO_EASY" : "NUMBER", number: i % 3 === 0 ? null : 2 } });
      await prisma.comment.create({ data: { problemId: problem.id, authorId: other.id, body: i % 2 ? "Nice problem! The key idea is $n^2+1 \\mid 2$." : "Solved it — the second part is harder than it looks.", isSpoiler: i % 2 === 1 } });
    }
    await prisma.translation.create({
      data: { problemId: (await prisma.problem.findFirst({ where: { groupId: group.id, name: "Prime gaps" } }))!.id, language: "sv", statement: String.raw`Visa att det för varje positivt heltal $k$ finns $k$ på varandra följande positiva heltal av vilka inget är ett primtal.`, solution: String.raw`Tag $(k+1)! + 2, \ldots, (k+1)! + (k+1)$.`, updatedById: alice.id },
    });
  }
  const geo = await prisma.problem.findFirst({ where: { groupId: group.id, name: "Tangent circles" } });
  if (geo && !geo.imageId) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200"><rect width="320" height="200" fill="white"/><circle cx="110" cy="100" r="70" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="200" cy="100" r="60" fill="none" stroke="#1e293b" stroke-width="2"/><line x1="40" y1="60" x2="280" y2="130" stroke="#4f46e5" stroke-width="2"/><text x="150" y="70" font-family="serif" font-size="16">A</text><text x="150" y="150" font-family="serif" font-size="16">B</text></svg>`;
    const img = await prisma.image.create({ data: { groupId: group.id, uploadedById: alice.id, filename: "tangent-circles.svg", mimeType: "image/svg+xml", data: Buffer.from(svg), size: svg.length } });
    await prisma.problem.update({ where: { id: geo.id }, data: { imageId: img.id } });
  }
  console.log("Seeded demo group. Log in as alice@example.com or bob@example.com with password demo1234.");
}

const FORMATTING = String.raw`\documentclass[a4paper,11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{graphicx}
\usepackage{geometry}
\geometry{margin=2.5cm}

\title{<<CONTEST>>}
\date{}

\begin{document}
\maketitle

\begin{enumerate}
<<PROBLEMS>>
\end{enumerate}

\end{document}
`;

main().finally(() => prisma.$disconnect());
