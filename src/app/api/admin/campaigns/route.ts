import { NextResponse, after } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { audienceLabel, campaignPhones, parseAudience } from "@/lib/segments";
import { campaignParts, MAX_RECIPIENTS, runCampaign } from "@/lib/campaigns";
import { getSmsSettings } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  name: z.string().trim().min(2, "Name the campaign").max(80),
  message: z.string().trim().min(5, "Write the message").max(612),
  audience: z.record(z.string(), z.unknown()),
  /** The number of recipients the admin saw and confirmed. */
  confirmCount: z.number().int().min(1),
});

/** Sends a promotional SMS to a customer group (only those who didn't opt out). */
export async function POST(req: Request) {
  const session = await adminSession("marketing");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const sms = await getSmsSettings();
  if (!sms.enabled || !sms.apiKey) return NextResponse.json({ error: "Set up SMS first (Admin → SMS)" }, { status: 400 });

  const audience = parseAudience(parsed.data.audience);
  const phones = await campaignPhones(audience);
  if (!phones.length) return NextResponse.json({ error: "Nobody in this group can get SMS" }, { status: 400 });
  if (phones.length !== parsed.data.confirmCount) {
    return NextResponse.json(
      { error: `The group changed: it now has ${phones.length} numbers. Check and send again.`, count: phones.length },
      { status: 409 },
    );
  }
  if (phones.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `At most ${MAX_RECIPIENTS.toLocaleString()} numbers per campaign` }, { status: 400 });
  }
  const category = audience.categoryId
    ? await prisma.category.findUnique({ where: { id: audience.categoryId }, select: { name: true } })
    : null;
  const parts = campaignParts(parsed.data.message);
  // One campaign at a time, and never the same text twice in a row: a double
  // click must not send twice. Checked and created under one lock.
  const campaign = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72707370)`;
    const busy = await tx.smsCampaign.findFirst({
      where: {
        createdAt: { gt: new Date(Date.now() - 15 * 60_000) },
        OR: [{ status: "sending" }, { message: parsed.data.message, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } }],
      },
      select: { status: true },
    });
    if (busy) return busy.status === "sending" ? "running" : "duplicate";
    return tx.smsCampaign.create({
      data: {
        name: parsed.data.name,
        message: parsed.data.message,
        audience: { ...audience, label: audienceLabel(audience, category?.name) },
        recipients: phones.length,
        smsParts: parts,
        createdById: session.user.id,
      },
    });
  });
  if (campaign === "running") {
    return NextResponse.json({ error: "Another campaign is still sending. Wait for it to finish." }, { status: 409 });
  }
  if (campaign === "duplicate") {
    return NextResponse.json({ error: "This exact message was sent in the last 10 minutes." }, { status: 409 });
  }
  after(() =>
    runCampaign(campaign.id, phones).catch(async (err) => {
      console.error("campaign failed", err);
      await prisma.smsCampaign
        .update({ where: { id: campaign.id }, data: { status: "failed", error: String(err).slice(0, 300), finishedAt: new Date() } })
        .catch(() => {});
    }),
  );
  await audit(session, {
    action: "campaign.send",
    targetType: "campaign",
    targetId: campaign.id,
    summary: `"${campaign.name}" to ${phones.length} numbers (${audienceLabel(audience, category?.name)}), ${parts} SMS each`,
    data: { message: parsed.data.message },
  });
  return NextResponse.json({ id: campaign.id, recipients: phones.length });
}
