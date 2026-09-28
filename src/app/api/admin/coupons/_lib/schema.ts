import { z } from "zod";
import { CouponType, type Coupon } from "@/generated/prisma";

const optionalDate = z
  .union([z.string(), z.null()])
  .transform((v, ctx) => {
    if (v == null || v.trim() === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

const optionalPositiveInt = (label: string) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`)
    .nullable();

export const couponFields = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(
      z
        .string()
        .min(3, "Code must be at least 3 characters")
        .max(32, "Code must be at most 32 characters")
        .regex(/^[A-Z0-9_-]+$/, "Code may only contain letters, numbers, - and _"),
    ),
  description: z.string().trim().max(200, "Description is too long").default(""),
  type: z.enum(CouponType),
  value: z.number().positive("Value must be greater than 0"),
  minSubtotal: z.number().nonnegative("Minimum spend cannot be negative").default(0),
  maxDiscount: z.number().positive("Max discount must be greater than 0").nullable().default(null),
  usageLimit: optionalPositiveInt("Usage limit").default(null),
  perUserLimit: optionalPositiveInt("Per-customer limit").default(null),
  startsAt: optionalDate.default(null),
  endsAt: optionalDate.default(null),
  active: z.boolean().default(true),
});

export type CouponFields = z.output<typeof couponFields>;

/** Cross-field rules, applied to the full (merged) coupon. */
export function checkCoupon(c: CouponFields): string | null {
  if (c.type === "PERCENT" && c.value > 100) {
    return "Percentage discount cannot be more than 100";
  }
  if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) {
    return "End date must be after the start date";
  }
  return null;
}

/** Turns a DB row back into validated field values (for PATCH merges). */
export function rowToFields(row: Coupon): CouponFields {
  return {
    code: row.code,
    description: row.description,
    type: row.type,
    value: Number(row.value),
    minSubtotal: Number(row.minSubtotal),
    maxDiscount: row.maxDiscount != null ? Number(row.maxDiscount) : null,
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    active: row.active,
  };
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export const isUniqueViolation = (err: unknown) =>
  (err as { code?: string } | null)?.code === "P2002";
