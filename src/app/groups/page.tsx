import { requireUser } from "@/lib/session";
import { switchGroup, logout } from "@/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { CreateGroupForm, JoinGroupForm } from "@/components/GroupForms";

export default async function GroupsPage() {
  const user = await requireUser();
  return (
    <AuthShell title="Your problem groups">
      <div className="space-y-6">
        {user.groups.length > 0 ? (
          <ul className="space-y-2">
            {user.groups.map((g) => (
              <li key={g.id}>
                <form action={switchGroup}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <button className="w-full text-left rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 flex justify-between items-center cursor-pointer">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-slate-500">{g.role === "ADMIN" ? "admin" : "member"} →</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">You are not a member of any group yet. Join one with an invite code or create your own.</p>
        )}
        <JoinGroupForm />
        <CreateGroupForm />
        <form action={logout} className="text-center">
          <button className="text-sm text-slate-500 hover:underline cursor-pointer">Log out ({user.email})</button>
        </form>
      </div>
    </AuthShell>
  );
}
