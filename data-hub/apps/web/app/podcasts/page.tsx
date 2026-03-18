import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { SourceList } from "@/components/source-list";
import { getFeed, getSources, requireSession } from "@/lib/server-api";

export default async function PodcastsPage() {
  const session = await requireSession();
  const [feed, sources] = await Promise.all([
    getFeed({ module: "podcasts", limit: 20 }),
    getSources("podcasts"),
  ]);

  return (
    <AppShell
      user={session.user}
      currentPath="/podcasts"
      eyebrow="Podcast Shelf"
      title="Episodes ready to play"
      description="New podcast episodes from the shared catalog, with local caching for followed feeds and a sticky player."
    >
      <section className="panel">
        <div className="feed-grid">
          {feed.items.map((item) => (
            <FeedCard item={item} key={item.id} />
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Podcast feeds</span>
            <h2>Shared library</h2>
          </div>
        </div>
        <SourceList sources={sources} />
      </section>
    </AppShell>
  );
}
