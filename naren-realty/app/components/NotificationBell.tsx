"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";

type NotificationRow = {
  id: string;
  event_key: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;
    let currentUserId: string | null = null;

    const clearUser = () => {
      currentUserId = null;
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      setItems([]);
      setUnread(0);
      setReady(false);
    };

    const connectUser = async (userId: string) => {
      if (!active || currentUserId === userId) return;
      clearUser();
      currentUserId = userId;
      const { data, error } = await supabase
        .from("notifications")
        .select("id,event_key,title,body,action_url,read_at,created_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active || currentUserId !== userId) return;
      if (error) {
        console.error("[notifications] Initial load failed", { code: error.code });
        setReady(true);
        return;
      }
      const rows = (data ?? []) as NotificationRow[];
      setItems(rows);
      setUnread(rows.filter((row) => !row.read_at).length);
      setReady(true);
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
          (payload) => {
            if (!active || currentUserId !== userId) return;
            const row = payload.new as NotificationRow;
            setItems((current) => [row, ...current].slice(0, 20));
            setUnread((count) => count + 1);
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[notifications] Realtime subscription failed", status);
          }
        });
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (user) void connectUser(user.id);
      else clearUser();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      Promise.resolve().then(() => {
        if (!active) return;
        if (session?.user) void connectUser(session.user.id);
        else clearUser();
      });
    });

    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      document.removeEventListener("mousedown", closeOnOutside);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(item: NotificationRow) {
    if (item.read_at) return;
    const supabase = createSupabaseBrowserClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", item.id)
      .is("read_at", null);
    if (error) return;
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: now } : row));
    setUnread((count) => Math.max(0, count - 1));
  }

  if (!ready) return null;

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-[#10243A] shadow-lg transition hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <section aria-label="Notifications" className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-[#10243A]">Notifications</h2>
              <p className="text-xs text-slate-500">{unread} unread</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">Close</button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up. New updates will appear here.</p>
            ) : items.map((item) => (
              <div key={item.id} className={`border-b border-slate-100 px-4 py-3 ${item.read_at ? "bg-white" : "bg-amber-50/70"}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-slate-300" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#10243A]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <time className="text-[10px] text-slate-400" dateTime={item.created_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time>
                      <div className="flex items-center gap-3">
                        {!item.read_at && <button type="button" onClick={() => void markRead(item)} className="text-[11px] font-semibold text-amber-800 hover:underline">Mark read</button>}
                        {item.action_url?.startsWith("/") && <Link href={item.action_url} onClick={() => { void markRead(item); setOpen(false); }} className="text-[11px] font-semibold text-[#10243A] hover:underline">Open</Link>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
