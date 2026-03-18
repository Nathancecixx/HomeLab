import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { getFeed, requireSession } from "@/lib/server-api";

export default async function SavedPage() {
  const session = await requireSession();
  const feed = await getFeed({ savedOnly: true, limit: 30 });

  return (
    <AppShell
      user={session.user}
      currentPath="/saved"
      eyebrow="Saved Items"
      title="Your kept stories and media"
      description="Pinned items survive the media-cache pruning rules and stay close at hand for later."
    >
      {feed.items.length ? (
        <div className="feed-grid">
          {feed.items.map((item) => (
            <FeedCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">Save a few stories, videos, or episodes from the inbox and they will appear here.</div>
      )}
    </AppShell>
  );
}
