import nodemailer from 'nodemailer';

type EmailTask = { to: string; subject: string; text: string };

const queue: EmailTask[] = [];
let processing = false;

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
      await sendEmail(task);
    } catch (err) {
      console.error('Email send failed, requeueing:', err);
      queue.push(task);
      // wait before retrying
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  processing = false;
}

async function sendEmail(task: EmailTask) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    // SMTP not configured; just log
    console.log(`Email (skipped, no SMTP): to=${task.to}, subject=${task.subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: !!process.env.SMTP_SECURE, // true for 465
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({ from, to: task.to, subject: task.subject, text: task.text });
  console.log('Email sent to', task.to);
}
