import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Mangrove roots holding a city — the thesis, drawn. Purely decorative. */}
      <div className="artwork-veil pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="rise w-full max-w-md">
          <div className="flex items-center gap-3.5">
            <span className="mark h-11 w-11 shrink-0" role="img" aria-label="Living Grid" />
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Living Grid
            </h1>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            Discovering urban ecosystems through verifiable bio-acoustic data.
          </p>

          <div className="mt-10 rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-6 backdrop-blur-md">
            {session?.user ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Signed in as
                </p>
                <p className="mt-1.5 font-medium break-all">{session.user.email}</p>
                {session.user.name && (
                  <p className="text-sm text-[var(--muted)]">{session.user.name}</p>
                )}

                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="mt-6 w-full rounded-lg border border-[var(--hairline)] px-4 py-2.5 text-sm transition-colors hover:bg-[var(--accent)]/8"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed">
                  Leave your phone outside. Protect local creatures.
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                  Your voice-memo submissions become ecological evidence. This is
                  how you help them.
                </p>

                <form
                  action={async () => {
                    "use server";
                    await signIn("google", { redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="mt-6 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
                  >
                    Continue with Google
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">
            A decentralized urban research network to guide policy, development,
            and conservation.
          </p>
        </div>
      </div>
    </main>
  );
}
