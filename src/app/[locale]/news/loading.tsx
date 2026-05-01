import { SkeletonCard } from "@/components/Skeleton";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        <div className="h-8 w-40 mb-6 rounded bg-zinc-800/60 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
