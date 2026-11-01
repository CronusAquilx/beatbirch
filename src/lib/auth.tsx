import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean; guest: boolean };
type AuthCtx = AuthState & { enterGuest: () => void; exitGuest: () => void };
const GUEST_KEY = "birch-guest-mode";
const AuthContext = createContext<AuthCtx>({ session: null, user: null, loading: true, guest: false, enterGuest: () => {}, exitGuest: () => {} });

function readGuest() {
  try { return window.sessionStorage.getItem(GUEST_KEY) === "1"; } catch { return false; }
}
function writeGuest(on: boolean) {
  try { if (on) window.sessionStorage.setItem(GUEST_KEY, "1"); else window.sessionStorage.removeItem(GUEST_KEY); } catch { /* storage unavailable */ }
}

/** Guest mode shows the same signed-in layouts with no session: nothing can be saved because the database only accepts signed-in users. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true, guest: false });
  useEffect(() => {
    const apply = (session: Session | null) => {
      if (session) writeGuest(false);
      setState({ session, user: session?.user ?? null, loading: false, guest: !session && readGuest() });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  const enterGuest = () => { writeGuest(true); setState(s => ({ ...s, session: null, user: null, guest: true })); };
  const exitGuest = () => { writeGuest(false); setState(s => ({ ...s, guest: false })); };
  return <AuthContext.Provider value={{ ...state, enterGuest, exitGuest }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
