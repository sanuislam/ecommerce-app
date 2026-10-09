import "server-only";
import { prisma } from "@/lib/prisma";
import { getSmsSettings, sendSms } from "@/lib/sms";
import { smsInfo } from "@/lib/sms-count";

/** Numbers per gateway request (Alpha SMS takes a comma-separated list). */
const BATCH = 100;
export const MAX_RECIPIENTS = 10_000;

/**
 * Sends a campaign that was already created with its recipients' count.
 * Runs after the response (next/server `after`). Each batch is logged in
 * SmsLog (event "campaign:<id>:<n>") and the counts are kept on the row,
 * so the page shows progress and a crash leaves an honest record.
 */
export async function runCampaign(campaignId: string, phones: string[]) {
  const c = await prisma.smsCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return;
  const s = await getSmsSettings();
  if (!s.enabled || !s.apiKey) {
    await prisma.smsCampaign.update({
      where: { id: campaignId },
      data: { status: "failed", error: "SMS is not set up", finishedAt: new Date() },
    });
    return;
  }
  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (let i = 0; i < phones.length; i += BATCH) {
    const batch = phones.slice(i, i + BATCH);
    const log = await prisma.smsLog.create({
      data: {
        orderId: null,
        event: `campaign:${campaignId}:${i / BATCH + 1}`,
        phone: batch.length > 1 ? `${batch[0]} +${batch.length - 1}` : batch[0],
        message: c.message,
      },
    });
    const r = await sendSms(s.apiKey, batch.join(","), c.message, s.senderId || undefined);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: r.ok ? { status: "sent", requestId: r.requestId } : { status: "failed", error: r.error.slice(0, 300) },
    });
    if (r.ok) sent += batch.length;
    else {
      failed += batch.length;
      lastError = r.error.slice(0, 300);
    }
    await prisma.smsCampaign.update({ where: { id: campaignId }, data: { sent, failed, error: lastError } });
  }
  await prisma.smsCampaign.update({
    where: { id: campaignId },
    data: { status: sent ? "done" : "failed", finishedAt: new Date() },
  });
}

export const campaignParts = (message: string) => smsInfo(message).parts;
