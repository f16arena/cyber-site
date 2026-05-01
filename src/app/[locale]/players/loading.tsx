import { SkeletonRow } from "@/components/Skeleton";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
        <div className="h-8 w-48 mb-2 rounded bg-zinc-800/60 animate-pulse" />
        <div className="h-4 w-72 mb-6 rounded bg-zinc-800/40 animate-pulse" />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
