import { auth, signIn, signOut } from "@/auth";
import ScrollProgress from "./scroll-progress";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative">
      <ScrollProgress />

      {/* Mangrove roots holding a city — the thesis, drawn. Purely decorative. */}
      <div className="artwork-veil" aria-hidden="true" />

      <section className="hero px-6">
        <div className="rise mx-auto w-full max-w-md">
          <div className="flex items-center gap-3.5">
            <span className="mark h-11 w-11 shrink-0" role="img" aria-label="Living Grid" />
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Living Grid
            </h1>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            Discovering urban ecosystems through verifiable bio-acoustic data.
          </p>
        </div>
      </section>

      <section className="panel px-6 pb-10">
        <div className="panel-inner mx-auto w-full max-w-md">
          <div className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-6 backdrop-blur-md">
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

          <p className="mt-5 text-[11px] leading-relaxed italic text-[var(--muted)] opacity-80">
            Project by Patricio Con Todo
            <br />
            Artwork by Lee Pivnic
          </p>
        </div>
      </section>
    </main>
  );
}
