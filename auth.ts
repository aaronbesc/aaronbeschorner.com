import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Sign-in for the private pages under /admin. GitHub is the only provider,
// and only the GitHub account in ADMIN_GITHUB_ID (its numeric id, which
// stays the same if the username changes) is let in. There is no user
// table: the session is a signed, encrypted cookie (AUTH_SECRET).

const OWNER = process.env.ADMIN_GITHUB_ID;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/admin/login", error: "/admin/login" },
  session: { maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    // Anyone else's GitHub account is turned away before a session exists.
    signIn: ({ profile }) => Boolean(OWNER) && String(profile?.id) === OWNER,
    jwt({ token, profile }) {
      if (profile) token.githubId = String(profile.id);
      return token;
    },
    session({ session, token }) {
      session.user.githubId = token.githubId as string | undefined;
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    githubId?: string;
  }
}

/** Whether the request comes from the owner. Checked again on every page, action and download. */
export async function isOwner() {
  const session = await auth();
  return Boolean(OWNER) && session?.user?.githubId === OWNER;
}
