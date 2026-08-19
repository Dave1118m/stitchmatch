import nodemailer from 'nodemailer';

export type EmailTask = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const queue: EmailTask[] = [];
let processing = false;

function getTransporter() {
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send an email immediately (priority dispatch for OTPs / password reset)
 */
export async function sendDirectEmail(task: EmailTask): Promise<boolean> {
  const from = (process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@stitchmatch.com').trim();
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`⚠️ SMTP not configured. Skipped sending email to: ${task.to} [Subject: ${task.subject}]`);
    if (task.text) {
      console.log(`[Email Plaintext Preview]:\n${task.text}`);
    }
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: task.to,
      subject: task.subject,
      text: task.text || '',
      html: task.html || task.text || '',
    });
    console.log(`📧 Email delivered successfully to ${task.to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to deliver email to ${task.to}:`, error?.message || error);
    throw error;
  }
}

/**
 * Enqueue an email for background asynchronous processing
 */
export function enqueueEmail(task: EmailTask) {
  queue.push(task);
  processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const task = queue.shift()!;
    try {
      await sendDirectEmail(task);
    } catch (err) {
      console.error('Email send failed, requeueing:', err);
      // wait before retrying once
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  processing = false;
}

