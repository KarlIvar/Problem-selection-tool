export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">UVS Problem Selection</div>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
