import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { SourceList } from "@/components/source-list";
import { getFeed, getSources, requireSession } from "@/lib/server-api";

export default async function InboxPage() {
  const session = await requireSession();
  const [feed, sources] = await Promise.all([
    getFeed({ limit: 24 }),
    getSources(),
  ]);

  return (
    <AppShell
      user={session.user}
      currentPath="/"
      eyebrow="Unified Inbox"
      title="Your private timeline"
      description="Every followed source in one reverse-chronological stream, without ranking, trends, or algorithmic detours."
    >
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Timeline</span>
            <h2>Latest from your followed sources</h2>
          </div>
        </div>
        {feed.items.length ? (
          <div className="feed-grid">
            {feed.items.map((item) => (
              <FeedCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Follow a few sources from the catalog to start building your timeline.</div>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">Source Catalog</span>
            <h2>Shared sources you can follow</h2>
          </div>
        </div>
        <SourceList sources={sources} />
      </section>
    </AppShell>
  );
}
