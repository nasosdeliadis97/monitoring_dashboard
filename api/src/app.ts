import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { monitorsRouter } from "./modules/monitors/monitors.routes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "monitoring-dashboard-api",
  });
});

app.get("/db-health", async (_req, res) => {
  const userCount = await prisma.user.count();

  res.json({
    status: "ok",
    database: "connected",
    userCount,
  });
});

app.use("/auth", authRouter);

app.get("/me", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }

  res.json({
    user,
  });
});

app.use("/monitors", requireAuth, monitorsRouter);

app.use(notFoundHandler);
app.use(errorHandler);