import { z } from "zod";
import { intentIds, levelIds, roleIds, STACK } from "./options";

const trimmed = (max: number) => z.string().trim().max(max);

const phone = z
  .string()
  .trim()
  .max(24)
  .refine((v) => v === "" || /^\+?[0-9 ()-]{7,22}$/.test(v), "Use digits only, e.g. +234 801 234 5678.");

const handleLike = (label: string) =>
  z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || !/\s/.test(v), `${label} can't contain spaces.`);

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(60),
  headline: trimmed(80),
  bio: trimmed(280),
  role: z.enum(roleIds, { message: "Pick what you do." }),
  level: z.enum(levelIds, { message: "Pick where you are on your journey." }),
  intents: z.array(z.enum(intentIds)).min(1, "Pick at least one thing you're here for.").max(8),
  stack: z.array(z.enum(STACK)).max(10, "Pick up to 10."),
  cities: z.array(z.string().trim().max(60)).min(1, "Add at least one city, so we can show you events near you.").max(10, "Up to 10 cities."),
  whatsapp: phone,
  phone: phone,
  contact_email: z.string().trim().max(120).refine((v) => v === "" || z.string().email().safeParse(v).success, "That email doesn't look right."),
  linkedin: handleLike("LinkedIn"),
  github: handleLike("GitHub"),
  x_handle: handleLike("X"),
  website: handleLike("Website"),
  listed: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const noteSchema = trimmed(200);

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Something in the form isn't right.";
}
