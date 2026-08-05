import { env } from "./config/env";
import express from "express";
import { Request, Response } from "express";
import { userRouter } from "./routes/user.routes";

const app = express();
const PORT = env.PORT;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello Docker World!");
});

app.use("/api/users", userRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});