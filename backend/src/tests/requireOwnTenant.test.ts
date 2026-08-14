import "../utils/bigint";
import { Request, Response } from "express";
import { requireOwnTenant } from "../middlewares/requireOwnTenant";

function mockRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireOwnTenant", () => {
  it("responds 400 for a non-numeric id", async () => {
    const lookup = jest.fn();
    const req = { params: { id: "abc" }, auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireOwnTenant(lookup)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(lookup).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 404 when the record doesn't exist", async () => {
    const lookup = jest.fn().mockResolvedValue(null);
    const req = { params: { id: "1" }, auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireOwnTenant(lookup)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 404 when the record belongs to a different tenant", async () => {
    const lookup = jest.fn().mockResolvedValue(9n);
    const req = { params: { id: "1" }, auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireOwnTenant(lookup)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the record belongs to the caller's own tenant", async () => {
    const lookup = jest.fn().mockResolvedValue(5n);
    const req = { params: { id: "1" }, auth: { userId: 1n, tenantId: 5n, username: "alice" } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    await requireOwnTenant(lookup)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
