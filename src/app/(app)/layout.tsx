import Link from "next/link";
import { requireContext } from "@/lib/session";
import { logout, switchGroup } from "@/actions/auth";
import { GroupSwitcher } from "@/components/GroupSwitcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, group } = await requireContext();
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/problems" className="font-bold text-indigo-700 whitespace-nowrap">
            UVS Problems
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/problems" className="btn-ghost">Problems</Link>
            <Link href="/papers" className="btn-ghost">Papers</Link>
            <Link href="/group" className="btn-ghost">Group</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <GroupSwitcher groups={user.groups} activeId={group.id} action={switchGroup} />
            <Link href="/profile" className="text-slate-700 hover:underline">{user.name}</Link>
            <form action={logout}>
              <button className="btn-ghost">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
