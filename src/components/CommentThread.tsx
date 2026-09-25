import { fmtDate } from "@/lib/util";
import { Latex } from "./Latex";
import { Spoiler } from "./Spoiler";
import { SubmitButton } from "./SubmitButton";
import { deleteComment } from "@/actions/problems";

export type ThreadComment = {
  id: string;
  body: string;
  isSpoiler: boolean;
  isEvent: boolean;
  createdAt: Date;
  authorId: string | null;
  author: { name: string } | null;
};

export function CommentThread({
  comments,
  currentUserId,
  isAdmin,
  addAction,
  hiddenFields,
  title = "Discussion",
}: {
  comments: ThreadComment[];
  currentUserId: string;
  isAdmin: boolean;
  addAction: (fd: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  title?: string;
}) {
  return (
    <section className="card">
      <div className="border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-slate-500">{comments.filter((c) => !c.isEvent).length} comments</span>
      </div>
      <ol className="divide-y divide-slate-100">
        {comments.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No activity yet.</li>}
        {comments.map((c) =>
          c.isEvent ? (
            <li key={c.id} className="px-4 py-1.5 text-xs text-slate-500 bg-slate-50 flex gap-2">
              <span className="shrink-0">⚙</span>
              <span>
                <span className="font-medium text-slate-600">{c.author?.name ?? "Someone"}</span> {c.body}{" "}
                <span className="ml-1 text-slate-400 whitespace-nowrap">· {fmtDate(c.createdAt)}</span>
              </span>
            </li>
          ) : (
            <li key={c.id} className="px-4 py-3 text-sm">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold">{c.author?.name ?? "Deleted user"}</span>
                <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                {c.isSpoiler && <span className="badge bg-rose-100 text-rose-700">spoiler</span>}
                {(isAdmin || c.authorId === currentUserId) && (
                  <form action={deleteComment} className="ml-auto">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-slate-400 hover:text-red-600 cursor-pointer">delete</button>
                  </form>
                )}
              </div>
              {c.isSpoiler ? (
                <Spoiler>
                  <Latex>{c.body}</Latex>
                </Spoiler>
              ) : (
                <Latex>{c.body}</Latex>
              )}
            </li>
          ),
        )}
      </ol>
      <form action={addAction} className="border-t border-slate-200 p-4 space-y-2">
        {Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <textarea name="body" required rows={3} className="input mono" placeholder="Write a comment… LaTeX math like $x^2$ works here." />
        <div className="flex items-center gap-4">
          <label className="text-sm flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="isSpoiler" /> Mark as spoiler
          </label>
          <SubmitButton className="btn-primary ml-auto">Post comment</SubmitButton>
        </div>
      </form>
    </section>
  );
}
