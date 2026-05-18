/**
 * Concatenate className strings, filtering out falsy values.
 * Lightweight clsx replacement — no library needed.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter((v): v is string => typeof v === "string" && v.length > 0).join(" ");
}
