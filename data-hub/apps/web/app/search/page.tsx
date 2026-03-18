import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { requireSession, searchFeed } from "@/lib/server-api";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const results = query ? await searchFeed(query, { limit: 30 }) : { items: [], total: 0, nextCursor: null };

  return (
    <AppShell
      user={session.user}
      currentPath="/search"
      eyebrow="Search"
      title={query ? `Results for “${query}”` : "Search across your hub"}
      description="Postgres full-text search filtered by your private source graph and chronological storage, not by engagement scoring."
    >
      {query ? (
        results.items.length ? (
          <div className="feed-grid">
            {results.items.map((item) => (
              <FeedCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No items matched this query yet.</div>
        )
      ) : (
        <div className="empty-state">Use the search bar in the header or press / to jump there instantly.</div>
      )}
    </AppShell>
  );
}
