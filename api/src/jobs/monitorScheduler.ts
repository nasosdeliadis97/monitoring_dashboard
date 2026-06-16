import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { runMonitorCheck } from "../modules/checks/check.service.js";

let isRunning = false;

async function runDueMonitorChecks() {
  if (isRunning) {
    console.log("Monitor scheduler already running, skipping...");
    return;
  }

  isRunning = true;

  try {
    const monitors = await prisma.monitor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        intervalSeconds: true,
        checks: {
          orderBy: {
            checkedAt: "desc",
          },
          take: 1,
          select: {
            checkedAt: true,
          },
        },
      },
    });

    const now = Date.now();

    for (const monitor of monitors) {
      const lastCheck = monitor.checks[0];

      const shouldRun =
        !lastCheck ||
        now - lastCheck.checkedAt.getTime() >= monitor.intervalSeconds * 1000;

      if (!shouldRun) {
        continue;
      }

      console.log(`Running scheduled check for: ${monitor.name}`);

      await runMonitorCheck({
        monitorId: monitor.id,
        userId: monitor.userId,
      });
    }
  } catch (error) {
    console.error("Monitor scheduler failed:", error);
  } finally {
    isRunning = false;
  }
}

export function startMonitorScheduler() {
  cron.schedule("* * * * *", async () => {
    await runDueMonitorChecks();
  });

  console.log("Monitor scheduler started");
}
