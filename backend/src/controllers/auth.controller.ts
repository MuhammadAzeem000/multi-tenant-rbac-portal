import { Request, Response } from "express";
import { z } from "zod";
import { loginSchema, refreshSchema } from "../interfaces/auth";
import * as authService from "../services/auth.service";
import * as userService from "../services/user.service";

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const outcome = await authService.login(result.data, req.ip ?? null);
  if (!outcome) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({ ...outcome.tokens, user: outcome.user });
}

export async function refresh(req: Request, res: Response) {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const tokens = await authService.refreshAccessToken(result.data.refreshToken);
  if (!tokens) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  res.json(tokens);
}

export async function logout(_req: Request, res: Response) {
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await userService.getUserById(req.auth!.userId);
  if (!user) {
    res.status(401).json({ error: "User no longer exists" });
    return;
  }
  res.json(user);
}
