import type { CSSProperties, ReactNode } from "react";
import { getAppearance, usePrefs } from "@/lib/astra/prefs";
import landscape from "@/assets/console-landscape.jpg";
import { SocialAccess } from "@/components/social/SocialAccess";
import { useVisit } from "@/lib/console/visit";
import { WallpaperEffects } from "@/components/astra/WallpaperEffects";
export function ConsoleShell({ hue = 210, children, bg }: { hue?: number; children: ReactNode; bg?: string }) {
  const p = usePrefs(); const look = getAppearance(p); const {stage}=useVisit(); const image = p.consoleBg === "custom" && p.consoleCustomBg ? p.consoleCustomBg : landscape;
  return <div className={`console-shell ${p.console === "series" ? "xbox-series" : ""} fixed inset-0 overflow-hidden bg-console-background text-console-foreground`} style={{ "--console-hue": hue, "--console-secondary": (hue + 60) % 360 } as CSSProperties}>
    <div className="console-backdrop pointer-events-none absolute inset-0">{look.artwork && p.consoleBg !== "focused" && <img src={image} width={1920} height={1088} alt="" className="h-full w-full object-cover"/>}<div className="absolute inset-0 console-shade"/>{p.consoleBg === "focused" && <div className="absolute inset-0" style={{ background: bg ?? "var(--console-scene)" }}/>}</div>
    <WallpaperEffects/>
    <div className="console-page relative h-full">{children}{stage==="ready"&&<SocialAccess floating />}</div>
  </div>;
}
