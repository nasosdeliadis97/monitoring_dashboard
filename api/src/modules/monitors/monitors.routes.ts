import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { runMonitorCheck } from "../checks/check.service.js";

export const monitorsRouter = Router();

const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).default(200),
  intervalSeconds: z.coerce.number().int().min(60).max(86400).default(300),
  timeoutSeconds: z.coerce.number().int().min(1).max(60).default(10),
});

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).optional(),
  intervalSeconds: z.coerce.number().int().min(60).max(86400).optional(),
  timeoutSeconds: z.coerce.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

async function findUserMonitor(monitorId: string, userId: string) {
  return prisma.monitor.findFirst({
    where: {
      id: monitorId,
      userId,
    },
  });
}

monitorsRouter.get("/", async (_req, res) => {
  const userId = res.locals.userId as string;

  const monitors = await prisma.monitor.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      url: true,
      expectedStatusCode: true,
      intervalSeconds: true,
      timeoutSeconds: true,
      isActive: true,
      lastStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    monitors,
  });
});

monitorsRouter.post("/", async (req, res) => {
  const userId = res.locals.userId as string;

  const parsed = createMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const monitor = await prisma.monitor.create({
    data: {
      userId,
      name: parsed.data.name,
      url: parsed.data.url,
      expectedStatusCode: parsed.data.expectedStatusCode,
      intervalSeconds: parsed.data.intervalSeconds,
      timeoutSeconds: parsed.data.timeoutSeconds,
    },
  });

  res.status(201).json({
    monitor,
  });
});

monitorsRouter.post("/:id/check-now", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const result = await runMonitorCheck({
    monitorId,
    userId,
  });

  if (!result) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  res.status(201).json(result);
});

monitorsRouter.get("/:id/checks", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const monitor = await findUserMonitor(monitorId, userId);

  if (!monitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  const checks = await prisma.check.findMany({
    where: {
      monitorId,
    },
    orderBy: {
      checkedAt: "desc",
    },
    take: 50,
  });

  res.json({
    checks,
  });
});

monitorsRouter.get("/:id/incidents", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const monitor = await findUserMonitor(monitorId, userId);

  if (!monitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  const incidents = await prisma.incident.findMany({
    where: {
      monitorId,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 50,
  });

  res.json({
    incidents,
  });
});

monitorsRouter.get("/:id/stats", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const days = Number(req.query.days ?? 7);

  if (!Number.isInteger(days) || days < 1 || days > 90) {
    res.status(400).json({
      message: "days must be an integer between 1 and 90",
    });
    return;
  }

  const monitor = await findUserMonitor(monitorId, userId);

  if (!monitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const checks = await prisma.check.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: fromDate,
      },
    },
    orderBy: {
      checkedAt: "desc",
    },
  });

  const totalChecks = checks.length;
  const upChecks = checks.filter((check) => check.status === "UP").length;
  const downChecks = checks.filter((check) => check.status === "DOWN").length;

  const checksWithResponseTime = checks.filter(
    (check) => check.responseTimeMs !== null
  );

  const averageResponseTimeMs =
    checksWithResponseTime.length === 0
      ? null
      : Math.round(
          checksWithResponseTime.reduce(
            (sum, check) => sum + (check.responseTimeMs ?? 0),
            0
          ) / checksWithResponseTime.length
        );

  const uptimePercentage =
    totalChecks === 0 ? null : Number(((upChecks / totalChecks) * 100).toFixed(2));

  const openIncidents = await prisma.incident.count({
    where: {
      monitorId,
      resolvedAt: null,
    },
  });

  res.json({
    monitorId,
    periodDays: days,
    totalChecks,
    upChecks,
    downChecks,
    uptimePercentage,
    averageResponseTimeMs,
    openIncidents,
    latestCheck: checks[0] ?? null,
  });
});

monitorsRouter.get("/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      userId,
    },
    include: {
      checks: {
        orderBy: {
          checkedAt: "desc",
        },
        take: 10,
      },
      incidents: {
        orderBy: {
          startedAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!monitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  res.json({
    monitor,
  });
});

monitorsRouter.patch("/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const parsed = updateMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const existingMonitor = await findUserMonitor(monitorId, userId);

  if (!existingMonitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  const monitor = await prisma.monitor.update({
    where: {
      id: monitorId,
    },
    data: parsed.data,
  });

  res.json({
    monitor,
  });
});

monitorsRouter.delete("/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const monitorId = req.params.id;

  const existingMonitor = await findUserMonitor(monitorId, userId);

  if (!existingMonitor) {
    res.status(404).json({
      message: "Monitor not found",
    });
    return;
  }

  await prisma.monitor.delete({
    where: {
      id: monitorId,
    },
  });

  res.status(204).send();
});
