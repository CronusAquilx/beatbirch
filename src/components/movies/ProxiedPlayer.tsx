import { useEffect, useRef, useState } from "react";
import { usePrefs } from "@/lib/astra/prefs";
import { openProxied } from "@/lib/astra/proxy";
import { attachProxiedPopups } from "@/lib/astra/proxy-popups";
import { discoverVoiceTracks, voiceLabel, type VoiceTrack } from "@/lib/movies/audio-tracks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Plays a streaming source (VidSrc, APIPlayer, …) through the site's proxy so the
 * browser only talks to this site. The full source address, including its
 * query string (autoplay, captions, resume time), is passed through unchanged.
 */
export function ProxiedPlayer({ src, title, onLoad, onError, anime = false }: { src: string; title: string; onLoad?: () => void; onError?: () => void; anime?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [tracks, setTracks] = useState<VoiceTrack[]>([]);
  const [audioError, setAudioError] = useState(false);
  const prefs = usePrefs();
  const loadRef = useRef(onLoad); loadRef.current = onLoad;
  const errRef = useRef(onError); errRef.current = onError;
  useEffect(() => {
    setTracks([]);
    setAudioError(false);
    const refresh = () => setTracks(discoverVoiceTracks(ref.current?.contentWindow ?? null));
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [src]);
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    let first = true;
    const loaded = () => { if (first && iframe.src.includes("/scramjet/p/")) { first = false; loadRef.current?.(); } };
    iframe.addEventListener("load", loaded);
    const detach = attachProxiedPopups(iframe, src, prefs);
    openProxied(iframe, src, prefs).catch(() => errRef.current?.());
    return () => { iframe.removeEventListener("load", loaded); detach(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, prefs.transport, prefs.wisp]);
  const active = tracks.find(track => track.active)?.id;
  return <div className="flex size-full flex-col">
    <iframe ref={ref} title={title} className="min-h-0 w-full flex-1 border-0" allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" />
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-background px-3 py-2">
      <span className="text-xs font-medium" id="voice-language-label">{anime ? 'Anime voices' : 'Audio language'}</span>
      {tracks.length > 0 ? <Select value={active ?? ''} onValueChange={id => {
        try { tracks.find(track => track.id === id)?.select(); setAudioError(false); setTracks(discoverVoiceTracks(ref.current?.contentWindow ?? null)); }
        catch { setAudioError(true); }
      }}><SelectTrigger aria-labelledby="voice-language-label" className="h-8 w-full sm:w-56"><SelectValue placeholder="Select spoken language" /></SelectTrigger><SelectContent>{tracks.map(track => <SelectItem key={track.id} value={track.id}>{voiceLabel(track.language, track.label, anime)}</SelectItem>)}</SelectContent></Select> : <span role="status" className="text-xs text-muted-foreground">{anime ? 'Dub availability depends on this source; no selectable voice tracks reported.' : 'No selectable voice tracks reported by this source.'}</span>}
      {audioError && <span role="alert" className="text-xs text-destructive">This source could not change the audio track.</span>}
    </div>
  </div>;
}
