import { z } from "zod";

export const bigIntId = z.union([z.string(), z.number(), z.bigint()]).transform((value, ctx) => {
  try {
    const id = BigInt(value);
    if (id <= 0n) throw new Error("non-positive");
    return id;
  } catch {
    ctx.addIssue({ code: "custom", message: "Must be a valid positive id" });
    return z.NEVER;
  }
});

/**
 * An optional "code" field backed by a unique constraint. An empty string must be
 * normalized to undefined — otherwise every record submitted with a blank code would
 * collide on the unique index instead of leaving the column unset.
 */
export function optionalUniqueCode(maxLength: number) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );
}
