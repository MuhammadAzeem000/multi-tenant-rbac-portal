import "./utils/bigint";
import { env } from "./config/env";
import express from "express";
import { Request, Response } from "express";
import { actionRouter } from "./routes/action.routes";
import { departmentRouter } from "./routes/department.routes";
import { errorHandler } from "./middlewares/errorHandler";
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

app.use("/api/tenants", tenantRouter);
app.use("/api/users", userRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/roles", roleRouter);
app.use("/api/modules", moduleRouter);
app.use("/api/actions", actionRouter);
app.use("/api/permissions", permissionRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});