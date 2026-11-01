import { createFileRoute } from "@tanstack/react-router";
import { MusicView } from "@/components/windows/views/MusicView";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({ meta: [{ title: "Music \u2014 BirchBlock" }, { name: "description", content: "Play songs, build playlists and let AI make mixes in BirchBlock." }, { property: "og:title", content: "Music \u2014 BirchBlock" }, { property: "og:description", content: "Play songs, build playlists and let AI make mixes in BirchBlock." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MusicView,
});
