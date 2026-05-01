import { SkeletonCard } from "@/components/Skeleton";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
        <div className="h-9 w-56 mb-2 rounded bg-zinc-800/60 animate-pulse" />
        <div className="h-4 w-80 mb-6 rounded bg-zinc-800/40 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
