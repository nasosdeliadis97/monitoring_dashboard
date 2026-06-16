import nodemailer from "nodemailer";

type SendAlertInput = {
  to: string;
  subject: string;
  text: string;
};

function smtpIsConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

async function sendEmail(input: SendAlertInput) {
  if (!smtpIsConfigured()) {
    console.log("Email alert fallback:");
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log(input.text);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Monitoring Dashboard <alerts@example.com>",
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

export async function sendMonitorDownAlert(input: {
  to: string;
  monitorName: string;
  monitorUrl: string;
  reason?: string | null;
}) {
  await sendEmail({
    to: input.to,
    subject: `[DOWN] ${input.monitorName}`,
    text: [
      `Monitor is DOWN: ${input.monitorName}`,
      `URL: ${input.monitorUrl}`,
      `Reason: ${input.reason ?? "Unknown reason"}`,
      "",
      "This alert was sent by Monitoring Dashboard.",
    ].join("\n"),
  });
}

export async function sendMonitorRecoveredAlert(input: {
  to: string;
  monitorName: string;
  monitorUrl: string;
}) {
  await sendEmail({
    to: input.to,
    subject: `[RECOVERED] ${input.monitorName}`,
    text: [
      `Monitor has recovered: ${input.monitorName}`,
      `URL: ${input.monitorUrl}`,
      "",
      "This alert was sent by Monitoring Dashboard.",
    ].join("\n"),
  });
}
