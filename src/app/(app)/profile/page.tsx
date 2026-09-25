import { requireContext } from "@/lib/session";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const { user } = await requireContext();
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <div className="card p-5">
        <ProfileForm name={user.name} email={user.email} />
      </div>
    </div>
  );
}
