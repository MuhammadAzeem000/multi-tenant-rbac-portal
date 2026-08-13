import { Request, Response } from "express";
import { z } from "zod";
import { createDepartmentSchema, updateDepartmentSchema } from "../interfaces/department";
import * as departmentService from "../services/department.service";
import { parseBigIntId, parsePagination } from "../utils";

function parseId(req: Request, res: Response): bigint | null {
  const id = parseBigIntId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid department id" });
    return null;
  }
  return id;
}

export async function getDepartments(req: Request, res: Response) {
  const pagination = parsePagination(req, res);
  if (!pagination) return;

  const tenantId = req.query.tenantId ? parseBigIntId(String(req.query.tenantId)) : undefined;
  if (req.query.tenantId && tenantId === null) {
    res.status(400).json({ error: "Invalid tenantId" });
    return;
  }

  const result = await departmentService.getDepartments({ tenantId: tenantId ?? undefined, ...pagination });
  res.json(result);
}

export async function getDepartmentById(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const department = await departmentService.getDepartmentById(id);
  if (!department) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  res.json(department);
}

export async function createDepartment(req: Request, res: Response) {
  const result = createDepartmentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const department = await departmentService.createDepartment(result.data);
  res.status(201).json(department);
}

export async function updateDepartment(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  const result = updateDepartmentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: z.flattenError(result.error) });
    return;
  }

  const department = await departmentService.updateDepartment(id, result.data);
  res.json(department);
}

export async function deleteDepartment(req: Request, res: Response) {
  const id = parseId(req, res);
  if (id === null) return;

  await departmentService.deleteDepartment(id);
  res.status(204).send();
}
