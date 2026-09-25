# UVS Problem Selection Tool

A web app for the math problem groups of Ung Vetenskapssport. It replaces the shared Overleaf document and the Discord forum with one place to

- **store problems** – name, LaTeX statement and solution (English), optional image, translations, subfield (Algebra / Combinatorics / Geometry / Number Theory) and author;
- **discuss problems** – a thread per problem with spoiler-tagged comments; every edit of the statement, solution or translations is noted automatically in the thread;
- **track who has solved what** – the 👀 "solved by me" mark, exactly like the eyes reaction on Discord;
- **rate difficulty** – for every contest, say which problem number the problem should be (or "too easy", "too hard", "don't know"); the problem list shows the median suggestion per contest;
- **draft papers** – one paper per contest (Höjdpunkten Högstadieklass, EGMO-kval, Höjdpunkten Gymnasieklass, EGMO-TST, Baltic Way, Höjdpunkten Öppen klass by default) with any number of drafts each, a drag-and-drop editor to swap problems in and out, "save changes" vs "save as new draft", and a discussion thread per paper in which draft creation, edits, duplication and deletion are logged;
- **format papers** – a LaTeX skeleton plus per-problem and per-solution templates per contest, with uploaded pictures (logos, figures); drafts export as a `.zip` with the `.tex` file and all images, in English or in any translated language;
- **share the app between problem groups** – users belong to groups joined via invite codes; problems, papers, drafts and threads are only visible inside their own group.

## Stack

Next.js 16 (App Router, server actions), TypeScript, Prisma with SQLite, Tailwind CSS, KaTeX for math rendering, dnd-kit for the draft editor. Everything runs in a single Node process with a single SQLite file, so hosting is trivial.

## Run locally

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET
npm run db:push             # creates data/dev.db
npm run dev                 # http://localhost:3000
```

Optional demo data (a group "Demo Problem Group" with invite code `DEMO2026`, users `alice@example.com` / `bob@example.com`, password `demo1234`, and a few problems):

```bash
npm run seed
```

## Deploy with Docker

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d --build
```

The app listens on port 3000; put it behind a reverse proxy with HTTPS (Caddy, nginx, Traefik). The SQLite database and all uploaded images live in the `app-data` volume – back that up. If you must serve over plain HTTP (e.g. only on a LAN), set `INSECURE_COOKIES=1` so the login cookie is not marked `Secure`.

The container runs `prisma db push` on start, so schema updates are applied automatically when you deploy a new version.

## Using the app

1. **First user**: register and choose *Create a new group*. You become the group's admin.
2. **Inviting others**: the *Group* page shows the invite code. Others register with it (or join from the *Groups* page if they already have an account). Admins can regenerate the code, rename the group, promote members and remove them.
3. **Contests**: the six default contests are created for every new group. Admins can rename, reorder, add and delete contests and set the number of problems on the *Group* page. The number of problems determines the slots in each draft and the numbers offered when rating.
4. **Problems**: *Problems → New problem*. Statements and solutions are LaTeX; `$…$`, `$$…$$`, `\[…\]`, `align`/`equation` environments, `\textbf`, `\emph`, `enumerate`/`itemize`, `\\` and paragraphs are rendered live. Solutions are hidden behind *Show solution*. Translations are added per language from the problem page.
5. **After solving a problem**: press *👀 Mark as solved by me*, leave a comment (tick *spoiler* if it gives anything away), and fill in your rating for each contest.
6. **Drafting a paper**: *Papers → contest → New draft*. Click *+* next to a pool problem to place it in the first empty slot (or in the selected slot), drag slots to reorder, ✕ to remove. Then *Create draft*, or on an existing draft *Save changes* / *Save as new draft*. All of this is logged in the paper's thread. The saved draft is previewed below the editor with a language switch and export buttons.
7. **Paper formatting**: *Papers → contest → Paper formatting*. The skeleton uses `<<PROBLEMS>>`, `<<SOLUTIONS>>`, `<<CONTEST>>`, `<<DRAFT>>`, `<<DATE>>`; the problem/solution templates use `<<NUMBER>>`, `<<NAME>>`, `<<AUTHOR>>`, `<<SUBFIELD>>`, `<<STATEMENT>>`, `<<SOLUTION>>`, `<<IMAGE>>` and `<<IFIMAGE>>…<<ENDIF>>`. Uploaded images are exported next to the `.tex` file with their filenames, so `\includegraphics{logo.png}` just works.

## Project layout

```
prisma/schema.prisma      data model (users, groups, problems, translations, comments, solves, ratings, contests, drafts, images)
prisma/seed.ts            optional demo data
src/lib/session.ts        cookie sessions; requireContext() gives the current user + active group
src/lib/latex.ts          LaTeX → HTML renderer (KaTeX for math)
src/actions/*.ts          server actions (all writes; every one checks the active group)
src/app/(app)/…           pages: problems, papers, drafts, formatting, group, profile
src/app/api/images/[id]   serves uploaded images (group-checked)
src/app/api/drafts/[id]/export   .tex / .zip export
src/components/DraftEditor.tsx   the drag-and-drop paper editor
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build and server |
| `npm run db:push` | create/update the SQLite schema |
| `npm run seed` | insert demo data |
| `npm run typecheck` | TypeScript check |
