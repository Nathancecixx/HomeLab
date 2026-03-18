import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { SourceList } from "@/components/source-list";
import { getFeed, getSources, requireSession } from "@/lib/server-api";

export default async function ChannelsPage() {
  const session = await requireSession();
  const [feed, sources] = await Promise.all([
    getFeed({ module: "channels", limit: 20 }),
    getSources("channels"),
  ]);

  return (
    <AppShell
      user={session.user}
      currentPath="/channels"
      eyebrow="Channel Hub"
      title="YouTube uploads without the feed algorithm"
      description="New videos from your followed channels with in-app playback and source-first context."
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
            <span className="eyebrow">Available channels</span>
            <h2>Shared library</h2>
          </div>
        </div>
        <SourceList sources={sources} />
      </section>
    </AppShell>
  );
}
