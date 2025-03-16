import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Config } from "./utils/config";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

// 認証が不要なパスのリスト
const publicPaths = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/welcome',
  '/auth/signout',
  '/about',
  '/contact',
];

// パスが公開パスかどうかをチェックする関数
function isPublicPath(path: string): boolean {
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}

// 環境変数WITH_AUTHがtrueの場合のみ認証を適用
export default async function middleware(req: NextRequest) {
  const withAuthEnabled = Config.WITH_AUTH;
  const path = req.nextUrl.pathname;
  
  // 認証が無効な場合は、リクエストをそのまま通過させる
  if (!withAuthEnabled) {
    return NextResponse.next();
  }

  // 公開パスの場合は認証チェックをスキップ
  if (isPublicPath(path)) {
    return NextResponse.next();
  }
  
  // 認証が有効な場合は、トークンをチェック
  const token = await getToken({ req });
  
  // トークンが存在しない場合は未認証
  if (!token) {
    // 現在のURLをcallbackUrlとして渡す
    const callbackUrl = encodeURIComponent(req.url);
    return NextResponse.redirect(new URL(`/auth/welcome?callbackUrl=${callbackUrl}`, req.url));
  }
  
  // トークンの有効期限をチェック
  if (typeof token.expiresAt === 'number' && Date.now() >= token.expiresAt * 1000) {
    const callbackUrl = encodeURIComponent(req.url);
    return NextResponse.redirect(new URL(`/auth/welcome?callbackUrl=${callbackUrl}`, req.url));
  }
  
  // 認証済みの場合は、リクエストをそのまま通過させる
  return NextResponse.next();
}