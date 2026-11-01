import { useEffect, useState } from "react";
import { CloudSun, MapPin, Music, Pause, Play, SkipBack, SkipForward, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { getAppearance, setAppearance, usePrefs } from "@/lib/astra/prefs";
import { activeLayout } from "@/lib/astra/appearance";
import { notesKey, weatherLabel } from "@/lib/astra/desktop-widgets";
import { artUrl, next, prev, seek, toggle, usePlayer } from "@/lib/music/player";

type Weather = { city: string; temperature: number; code: number };
function WeatherWidget() {
  const [city, setCity] = useState(""); const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function load(latitude: number, longitude: number, label: string) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
    if (!res.ok) throw new Error("Weather is unavailable. Try again.");
    const data = await res.json();
    if (!data.current || typeof data.current.temperature_2m !== "number") throw new Error("Weather is unavailable. Try again.");
    setWeather({ city: label, temperature: data.current.temperature_2m, code: data.current.weather_code });
  }
  async function search() {
    if (!city.trim() || busy) return; setBusy(true); setError("");
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`);
      if (!res.ok) throw new Error("City search is unavailable.");
      const place = (await res.json()).results?.[0];
      if (!place) throw new Error("City not found.");
      await load(place.latitude, place.longitude, `${place.name}, ${place.country_code}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Weather is unavailable."); } finally { setBusy(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setError("Location isn't available. Search a city instead."); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(p => { void load(p.coords.latitude, p.coords.longitude, "Your location").catch(() => setError("Weather is unavailable.")).finally(() => setBusy(false)); }, () => { setBusy(false); setError("Location unavailable. Search a city instead."); }, { timeout: 10000 });
  }
  return <><div className="flex items-center gap-3"><CloudSun className="size-8 text-star"/><div className="min-w-0">{weather ? <><p className="text-2xl font-medium">{Math.round(weather.temperature)}°C</p><p className="truncate text-xs">{weather.city} · {weatherLabel(weather.code)}</p></> : <p className="text-sm">Weather</p>}</div></div><form className="mt-3 flex gap-1" onSubmit={e => { e.preventDefault(); void search(); }}><Input aria-label="Weather city" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="h-8 min-w-0"/><Button size="sm" variant="secondary" disabled={busy || !city.trim()} type="submit">{busy ? "…" : "Find"}</Button><Button size="icon" variant="ghost" className="size-8 shrink-0" title="Use my location" aria-label="Use my location" disabled={busy} onClick={locate}><MapPin/></Button></form>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}<p className="mt-2 text-[10px] text-muted-foreground">Open-Meteo</p></>;
}
function NotesWidget() {
  const { user, guest } = useAuth(); const [note, setNote] = useState(""); const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => { setReady(false); setNote(""); if (user && !guest) { try { setNote(localStorage.getItem(notesKey(user.id)) ?? ""); } catch { setFailed(true); } } setReady(true); }, [user?.id, guest]);
  function update(value: string) { setNote(value); if (user && !guest) { try { localStorage.setItem(notesKey(user.id), value); setFailed(false); } catch { setFailed(true); } } }
  return <><h2 className="flex items-center gap-2 text-sm font-medium"><StickyNote className="size-4 text-star"/>Notes</h2><textarea aria-label="Desktop note" placeholder="What's on your mind?" disabled={!ready} value={note} onChange={e => update(e.target.value)} className="mt-3 h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"/><p className="text-[10px] text-muted-foreground">{guest || !user ? "Not saved in guest mode" : failed ? "Couldn't save on this device" : "Saved on this device"}</p></>;
}
function MusicWidget({ onMusic }: { onMusic: () => void }) {
  const player = usePlayer(); const track = player.queue[player.cur];
  return <><div className="flex items-center gap-3">{track?.art ? <img src={artUrl(track.art)} alt="" className="size-10 rounded object-cover"/> : <Music className="size-8 text-star"/>}<div className="min-w-0"><h2 className="truncate text-sm font-medium">{track?.title ?? "Music"}</h2><p className="truncate text-xs text-muted-foreground">{track?.artist ?? "Nothing playing"}</p></div></div>{track ? <><Slider aria-label="Music progress" className="mt-4" disabled={player.mode !== "audio"} min={0} max={Math.max(1, player.dur)} value={[Math.min(player.time, player.dur)]} onValueChange={v => seek(v[0] ?? 0)}/><div className="mt-3 flex justify-center gap-2"><Button size="icon" variant="ghost" title="Previous track" aria-label="Previous track" onClick={prev}><SkipBack/></Button><Button size="icon" variant="secondary" title={player.paused ? "Play" : "Pause"} aria-label={player.paused ? "Play" : "Pause"} onClick={toggle}>{player.paused ? <Play/> : <Pause/>}</Button><Button size="icon" variant="ghost" title="Next track" aria-label="Next track" onClick={next} disabled={player.cur >= player.queue.length - 1}><SkipForward/></Button></div>{player.status && <p className="mt-1 text-xs text-muted-foreground">{player.status}</p>}</> : <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={onMusic}><Music/>Open Music</Button>}</>;
}
export function DesktopWidgets({ onMusic }: { onMusic: () => void }) {
  const p = usePrefs(); const look = getAppearance(p); const layout = activeLayout(p);
  return <aside className="desktop-widgets" aria-label="Desktop widgets">{(["weather", "notes", "music"] as const).filter(id => look.widgets[id]).map(id => <section key={id} className="desktop-widget" aria-label={`${id} widget`}><Button variant="ghost" size="icon" className="widget-dismiss size-6" title={`Hide ${id} widget`} aria-label={`Hide ${id} widget`} onClick={() => setAppearance(layout, { widgets: { ...look.widgets, [id]: false } })}><X className="size-3"/></Button>{id === "weather" ? <WeatherWidget/> : id === "notes" ? <NotesWidget/> : <MusicWidget onMusic={onMusic}/>}</section>)}</aside>;
}