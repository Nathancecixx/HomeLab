import test from "node:test";
import assert from "node:assert/strict";

import { getAdapterForSource } from "../src/adapters/registry.js";

const rssFixture = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Security Wire</title>
    <link>https://example.com</link>
    <description>Daily security news</description>
    <item>
      <guid>one</guid>
      <title>Breaking zero-day update</title>
      <link>https://example.com/posts/zero-day</link>
      <pubDate>Wed, 17 Mar 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[Critical patch available now.]]></description>
      <category>security</category>
    </item>
  </channel>
</rss>`;

const podcastFixture = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Infra Cast</title>
    <link>https://pod.example.com</link>
    <description>Ops and homelab stories.</description>
    <item>
      <guid>episode-1</guid>
      <title>Episode 1</title>
      <link>https://pod.example.com/episodes/1</link>
      <pubDate>Wed, 17 Mar 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[Talking data hubs.]]></description>
      <enclosure url="https://cdn.example.com/audio/episode-1.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

const youtubeFixture = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Uploads from Example</title>
  <link rel="alternate" href="https://www.youtube.com/channel/UC123"/>
  <entry>
    <id>yt:video:abc123</id>
    <yt:videoId>abc123</yt:videoId>
    <title>Homelab Weekly</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
    <published>2026-03-17T12:00:00+00:00</published>
    <author><name>Example Channel</name></author>
    <media:group>
      <media:description>Fresh uploads every week.</media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" />
    </media:group>
  </entry>
</feed>`;

function fakeFetch(body: string) {
  return async () =>
    new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/xml",
      },
    });
}

test("rss adapter normalizes entries into chronological article items", async () => {
  const adapter = getAdapterForSource("rss", "rss");
  const items = await adapter.poll(
    {
      feedUrl: "https://example.com/feed.xml",
      module: "news",
      sourceType: "rss",
      adapterKey: "rss",
      title: "Security Wire",
    },
    { fetch: fakeFetch(rssFixture), now: () => new Date("2026-03-17T13:00:00Z") },
  );

  assert.equal(items[0]?.itemType, "article");
  assert.equal(items[0]?.title, "Breaking zero-day update");
});

test("podcast adapter keeps enclosure media for caching", async () => {
  const adapter = getAdapterForSource("podcast", "podcast");
  const items = await adapter.poll(
    {
      feedUrl: "https://pod.example.com/feed.xml",
      module: "podcasts",
      sourceType: "podcast",
      adapterKey: "podcast",
      title: "Infra Cast",
    },
    { fetch: fakeFetch(podcastFixture), now: () => new Date("2026-03-17T13:00:00Z") },
  );

  assert.equal(items[0]?.itemType, "podcast");
  assert.equal(items[0]?.mediaAssets[0]?.kind, "audio");
});

test("youtube adapter creates privacy-friendly embed metadata", async () => {
  const adapter = getAdapterForSource("youtube", "youtube");
  const items = await adapter.poll(
    {
      feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UC123",
      module: "channels",
      sourceType: "youtube",
      adapterKey: "youtube",
      title: "Example",
    },
    { fetch: fakeFetch(youtubeFixture), now: () => new Date("2026-03-17T13:00:00Z") },
  );

  assert.equal(items[0]?.videoId, "abc123");
  assert.match(items[0]?.embedUrl ?? "", /youtube-nocookie/);
});
