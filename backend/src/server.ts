import "./utils/bigint";
import { env } from "./config/env";
import express from "express";
import { Request, Response } from "express";
import { actionRouter } from "./routes/action.routes";
import { authRouter } from "./routes/auth.routes";
import { departmentRouter } from "./routes/department.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { authenticate } from "./middlewares/authenticate";
import { moduleRouter } from "./routes/module.routes";
import { notFound } from "./middlewares/notFound";
import { permissionRouter } from "./routes/permission.routes";
import { roleRouter } from "./routes/role.routes";
import { tenantRouter } from "./routes/tenant.routes";
import { userRouter } from "./routes/user.routes";

const app = express();
const PORT = env.PORT;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello Docker World!");
});

// Public: login/refresh issue tokens; tenant provisioning has no session to gate it on yet.
app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantRouter);

// Everything else requires a valid access token.
app.use("/api/users", authenticate, userRouter);
app.use("/api/departments", authenticate, departmentRouter);
app.use("/api/roles", authenticate, roleRouter);
app.use("/api/modules", authenticate, moduleRouter);
app.use("/api/actions", authenticate, actionRouter);
app.use("/api/permissions", authenticate, permissionRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});