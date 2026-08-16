import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Auth.js reads AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the
// environment automatically, so the Google provider needs no explicit config.
//
// trustHost is required off Vercel: Netlify terminates TLS at its edge and
// forwards the original host in a header, which Auth.js will not trust by
// default. Without this, production sign-in redirects to the wrong origin.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  trustHost: true,
});
