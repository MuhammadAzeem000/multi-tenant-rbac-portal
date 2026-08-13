import { Request, Response } from "express";
import { z } from "zod";
import { createActionSchema, updateActionSchema } from "../interfaces/action";
import * as actionService from "../services/action.service";
import { parseBigIntId, parsePagination } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid action id" });
    return null;
  }
  return id;
}

export async function getActions(req: Request, res: Response) {
  const pagination = parsePagination(req, res);
  if (!pagination) return;

  const result = await actionService.getActions(pagination);
  res.json(result);
}

export async function getActionById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const action = await actionService.getActionById(id);
  if (!action) {
    res.status(404).json({ error: "Action not found" });
    return;
  }
  res.json(action);
}

export async function createAction(req: Request, res: Response) {
  const result = createActionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const action = await actionService.createAction(result.data);
  res.status(201).json(action);
}

export async function updateAction(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateActionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const action = await actionService.updateAction(id, result.data);
  res.json(action);
}

export async function deleteAction(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  await actionService.deleteAction(id);
  res.status(204).send();
}
