import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import adminRouter from "./admin";
import mpesaRouter from "./mpesa";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/admin", adminRouter);
router.use("/mpesa", mpesaRouter);
router.use("/users", usersRouter);

export default router;
