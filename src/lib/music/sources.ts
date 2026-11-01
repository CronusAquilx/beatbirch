export const SERVERS = [
  { id: "auto", name: "Auto" },
  { id: "youtube", name: "YouTube" },
  { id: "jiosaavn", name: "JioSaavn" },
  { id: "audius", name: "Audius" },
  { id: "soundcloud", name: "SoundCloud" },
  { id: "deezer", name: "Deezer (preview)" },
] as const;
export type Server = (typeof SERVERS)[number]["id"];
export type AudioSource = Exclude<Server, "auto">;
export function sourceOrder(selected: Server, native?: string): AudioSource[] {
  const defaults: AudioSource[] = ["jiosaavn", "youtube", "audius", "soundcloud"];
  const first = selected === "auto" ? (native === "piped" ? "youtube" : native === "jiosaavn" ? "jiosaavn" : undefined) : selected;
  return first ? [first, ...defaults.filter(s => s !== first)] : defaults;
}
export function bestAudio<T extends { url?: string; bitrate?: number; quality?: string; mimeType?: string }>(streams: T[]): T | undefined {
  return streams.filter(s => s.url?.startsWith("https://") && (!s.mimeType || s.mimeType.startsWith("audio/")))
    .sort((a, b) => (Number(b.bitrate) || Number.parseInt(b.quality ?? "0") || 0) - (Number(a.bitrate) || Number.parseInt(a.quality ?? "0") || 0))[0];
}
export function allowedAudioUrl(raw: string, pipedHosts: string[] = []): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
    return ["dzcdn.net", "sndcdn.com", "googlevideo.com", "saavncdn.com", ...pipedHosts].some(h => u.hostname === h || u.hostname.endsWith(`.${h}`)) ||
      (u.hostname === "api.audius.co" && u.pathname.startsWith("/v1/tracks/"));
  } catch { return false; }
}