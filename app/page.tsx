import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Living Grid</h1>
        <p className="mt-2 text-sm opacity-70">
          Making urban ecosystems legible through verifiable acoustic data.
        </p>

        <div className="mt-8 rounded-lg border border-black/10 dark:border-white/15 p-5">
          {session?.user ? (
            <>
              <p className="text-xs uppercase tracking-wide opacity-60">
                Signed in as
              </p>
              <p className="mt-1 font-medium break-all">{session.user.email}</p>
              {session.user.name && (
                <p className="text-sm opacity-70">{session.user.name}</p>
              )}

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="mt-5 w-full rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm opacity-70">
                Sign in to contribute a recording.
              </p>

              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="mt-5 w-full rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Sign in with Google
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
