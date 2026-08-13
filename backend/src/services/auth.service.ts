import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AccessTokenClaims, AuthTokens, LoginInput, RefreshTokenClaims } from "../interfaces/auth";
import { UserResponse } from "../interfaces/user";

const credentialSelect = {
  id: true,
  tenantId: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatarUrl: true,
  jobTitle: true,
  employeeCode: true,
  passwordHash: true,
  status: true,
  isActive: true,
  isVerified: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  lastLoginIp: true,
  timezone: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

function signToken(payload: object, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

function signAccessToken(user: { id: bigint; tenantId: bigint; username: string }): {
  token: string;
  expiresIn: number;
} {
  const claims: AccessTokenClaims = {
    sub: user.id.toString(),
    tenantId: user.tenantId.toString(),
    username: user.username,
    type: "access",
  };
  const token = signToken(claims, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN);
  const decoded = jwt.decode(token) as (AccessTokenClaims & { exp?: number }) | null;
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
  return { token, expiresIn };
}

function signRefreshToken(user: { id: bigint; tenantId: bigint }): string {
  const claims: RefreshTokenClaims = {
    sub: user.id.toString(),
    tenantId: user.tenantId.toString(),
    type: "refresh",
  };
  return signToken(claims, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
}

function issueTokens(user: { id: bigint; tenantId: bigint; username: string }): AuthTokens {
  const { token: accessToken, expiresIn } = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { accessToken, refreshToken, tokenType: "Bearer", expiresIn };
}

export async function login(
  input: LoginInput,
  ip: string | null,
): Promise<{ tokens: AuthTokens; user: UserResponse } | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: input.tenantSlug, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!tenant) return null;

  const email = input.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      OR: [{ username: input.identifier }, { email }],
    },
    select: credentialSelect,
  });
  if (!user || !user.isActive || !user.passwordHash) return null;

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip ?? undefined },
  });

  const { passwordHash: _passwordHash, ...safeUser } = user;
  const tokens = issueTokens(safeUser);
  return { tokens, user: safeUser };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  let claims: RefreshTokenClaims;
  try {
    claims = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
  } catch {
    return null;
  }
  if (claims.type !== "refresh") return null;

  const user = await prisma.user.findFirst({
    where: { id: BigInt(claims.sub), tenantId: BigInt(claims.tenantId), deletedAt: null, isActive: true },
    select: { id: true, tenantId: true, username: true },
  });
  if (!user) return null;

  const { token: accessToken, expiresIn } = signAccessToken(user);
  return { accessToken, refreshToken, tokenType: "Bearer", expiresIn };
}
