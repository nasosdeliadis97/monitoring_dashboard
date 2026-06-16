import { prisma } from "../../lib/prisma.js";
import {
  sendMonitorDownAlert,
  sendMonitorRecoveredAlert,
} from "../alerts/alert.service.js";

type MonitorStatus = "UP" | "DOWN";

type RunMonitorCheckInput = {
  monitorId: string;
  userId: string;
};

type CheckResult = {
  status: MonitorStatus;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
};

async function performHttpCheck(params: {
  url: string;
  expectedStatusCode: number;
  timeoutSeconds: number;
}): Promise<CheckResult> {
  const startedAt = performance.now();

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, params.timeoutSeconds * 1000);

    const response = await fetch(params.url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const finishedAt = performance.now();
    const responseTimeMs = Math.round(finishedAt - startedAt);

    const isUp = response.status === params.expectedStatusCode;

    return {
      status: isUp ? "UP" : "DOWN",
      statusCode: response.status,
      responseTimeMs,
      errorMessage: isUp
        ? undefined
        : `Expected ${params.expectedStatusCode}, got ${response.status}`,
    };
  } catch (error) {
    const finishedAt = performance.now();
    const responseTimeMs = Math.round(finishedAt - startedAt);

    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "DOWN",
      responseTimeMs,
      errorMessage: message,
    };
  }
}

export async function runMonitorCheck(input: RunMonitorCheckInput) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: input.monitorId,
      userId: input.userId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!monitor) {
    return null;
  }

  const previousStatus = monitor.lastStatus;

  const result = await performHttpCheck({
    url: monitor.url,
    expectedStatusCode: monitor.expectedStatusCode,
    timeoutSeconds: monitor.timeoutSeconds,
  });

  const check = await prisma.check.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
    },
  });

  await prisma.monitor.update({
    where: {
      id: monitor.id,
    },
    data: {
      lastStatus: result.status,
    },
  });

  let incident = null;

  if (result.status === "DOWN" && previousStatus !== "DOWN") {
    incident = await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        reason: result.errorMessage ?? "Monitor is down",
      },
    });

    await sendMonitorDownAlert({
      to: monitor.user.email,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      reason: result.errorMessage,
    });
  }

  if (result.status === "UP" && previousStatus === "DOWN") {
    incident = await prisma.incident.updateMany({
      where: {
        monitorId: monitor.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    await sendMonitorRecoveredAlert({
      to: monitor.user.email,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
    });
  }

  return {
    monitorId: monitor.id,
    previousStatus,
    currentStatus: result.status,
    check,
    incident,
  };
}
