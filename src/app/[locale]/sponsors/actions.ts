"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientKey } from "@/lib/rate-limit";
import { headers } from "next/headers";

export type InquiryState = { ok?: boolean; error?: string };

export async function submitSponsorshipInquiry(
  _prev: InquiryState,
  formData: FormData
): Promise<InquiryState> {
  // Rate limit — 5 заявок в час с IP (анти-спам)
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "anon";
  if (!rateLimit(`inquiry:${ip}`, 5, 60 * 60_000).allowed) {
    return { error: "Слишком много заявок. Попробуй через час." };
  }

  const companyName = ((formData.get("companyName") as string) || "").trim();
  const contactName = ((formData.get("contactName") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const tier = formData.get("tier") as string | null;
  const message = ((formData.get("message") as string) || "").trim();

  if (companyName.length < 2) return { error: "Название компании слишком короткое" };
  if (contactName.length < 2) return { error: "Укажи контактное лицо" };
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return { error: "Неверный email" };
  }

  const validTiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const cleanTier =
    tier && validTiers.includes(tier)
      ? (tier as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM")
      : null;

  await prisma.sponsorshipInquiry.create({
    data: {
      companyName,
      contactName,
      email,
      phone: phone || null,
      tier: cleanTier,
      message: message || null,
    },
  });

  revalidatePath("/admin/inquiries");
  return { ok: true };
}
