import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { Config } from '@/utils/config';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: Config.AUTH_FIREBASE_API_KEY,
  authDomain: Config.AUTH_FIREBASE_AUTH_DOMAIN,
  projectId: Config.AUTH_FIREBASE_PROJECT_ID,
  storageBucket: Config.AUTH_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Config.AUTH_FIREBASE_MESSAGING_SENDER_ID,
  appId: Config.AUTH_FIREBASE_APP_ID,
  measurementId: Config.AUTH_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

const auth = getAuth(app);

async function refreshJWTToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Config.GOOGLE_CLIENT_ID as string,
        client_secret: Config.GOOGLE_CLIENT_SECRET as string,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: Config.GOOGLE_CLIENT_ID as string,
      clientSecret: Config.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          redirect_uri: "http://localhost:3000/api/auth/callback/google",
        },
      },
    }),
    CredentialsProvider({
      name: 'email',
      credentials: {
        email: { label: 'e-mail', type: 'email', required: true },
        password: { label: 'password', type: 'password', required: true },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
          const userToken = await user.user.getIdTokenResult();

          if (user) {
            const email = user.user.email;
            if (!email) throw new Error('Email is required but was not provided.');

            return {
              id: user.user.uid,
              accessToken: userToken.token,
              idToken: userToken.token,
              refreshToken: user.user.refreshToken,
              expiresAt: userToken.expirationTime ? new Date(userToken.expirationTime).getTime() / 1000 : undefined,
              email: email,
            };
          }
        } catch (error) {
          console.error('Error authorizing user:', error);
          return null;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    async jwt({ token, trigger, session, user, account }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.idToken = user.idToken;
        token.refreshToken = user.refreshToken;
        token.expiresAt = user.expiresAt;
        token.email = user.email;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
        token.refreshToken = account.refresh_token;
        token.email = account.email;
      }
      if (typeof token.expires_at === 'number' && token.expires_at < Date.now() / 1000) {
        return await refreshJWTToken(token);
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      session.email = token.email;
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60, // 90日（3ヶ月）
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/auth/signup',
  },
  jwt: {
    maxAge: 90 * 24 * 60 * 60, // 90日（3ヶ月）
  },
  secret: Config.NEXTAUTH_SECRET as string,
  logger: {
    error(code, metadata) {
      console.error(code, metadata);
    },
    warn(code) {
      console.warn(code);
    },
  },
}

export { authOptions };

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    email?: string;
  }

  interface User {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    email?: string;
  }

  interface Account {
    email?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    email?: string;
  }
}