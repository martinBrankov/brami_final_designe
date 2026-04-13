import nodemailer from "nodemailer";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createMailer() {
  return nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASS"),
    },
  });
}

export function getSender() {
  const name = process.env.SMTP_FROM_NAME || "Brami";
  const email = requireEnv("SMTP_FROM_EMAIL");

  return `"${name}" <${email}>`;
}
