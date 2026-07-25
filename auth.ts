import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { User as AppUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seedUserProblems } from "@/lib/seed-user";

declare module "next-auth" {
  interface Session {
    appUserId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
  }
}

async function ensureAppUser(params: {
  authJsUserId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<AppUser> {
  // #region agent log
  const t0 = Date.now();
  // #endregion
  const existing = await prisma.user.findUnique({
    where: { authJsUserId: params.authJsUserId },
  });
  if (existing) {
    const email = params.email ?? existing.email;
    const name = params.name ?? existing.name;
    const image = params.image ?? existing.image;
    const unchanged =
      email === existing.email && name === existing.name && image === existing.image;
    // #region agent log
    fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9e8e6e",
      },
      body: JSON.stringify({
        sessionId: "9e8e6e",
        runId: "login",
        hypothesisId: "L1",
        location: "auth.ts:ensureAppUser",
        message: "existing user login",
        data: { ms: Date.now() - t0, wrote: !unchanged },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (unchanged) return existing;
    return prisma.user.update({
      where: { id: existing.id },
      data: { email, name, image },
    });
  }

  const user = await prisma.user.create({
    data: {
      authJsUserId: params.authJsUserId,
      email: params.email ?? null,
      name: params.name ?? null,
      image: params.image ?? null,
    },
  });
  const seeded = await seedUserProblems(prisma, user.id);
  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9e8e6e",
    },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "login",
      hypothesisId: "L1",
      location: "auth.ts:ensureAppUser",
      message: "new user seeded",
      data: { ms: Date.now() - t0, created: seeded.created },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        const authJsUserId = `${account.provider}:${account.providerAccountId}`;
        const appUser = await ensureAppUser({
          authJsUserId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
        token.appUserId = appUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.appUserId) {
        session.appUserId = token.appUserId;
      }
      return session;
    },
  },
  trustHost: true,
});
