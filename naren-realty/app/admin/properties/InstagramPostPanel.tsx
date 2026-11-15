"use client";

import { useState } from "react";
import { createInstagramPreview, publishInstagramPreview } from "./instagram-actions";

type Post = { id: string; status: string; caption: string; permalink: string | null; last_error: string | null };

export default function InstagramPostPanel({ propertyId, imagePath }: { propertyId: string; imagePath: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imageUrl = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/property-photos/${imagePath.split("/").map(encodeURIComponent).join("/")}`
    : "";

  async function prepare() {
    setBusy(true); setMessage("");
    try {
      const result = await createInstagramPreview(propertyId);
      setPost(result); setCaption(result.caption);
      setMessage("Preview ready. Check the image and caption before publishing.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create preview."); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!post) return;
    if (!window.confirm("Publish this property post to Instagram now?")) return;
    setBusy(true); setMessage("");
    try {
      const result = await publishInstagramPreview(post.id, caption);
      setPost({ ...post, status: "published", caption, permalink: result.permalink, last_error: null });
      setMessage("Instagram confirmed publication.");
    } catch (error) {
      setPost({ ...post, status: "failed", last_error: error instanceof Error ? error.message : "Publishing failed." });
      setMessage(error instanceof Error ? error.message : "Publishing failed.");
    } finally { setBusy(false); }
  }

  return <section className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-sm font-bold text-violet-950">Instagram post</p><p className="text-xs text-violet-800">Preview first · Admin publishes manually</p></div>
      {!post && <button type="button" disabled={busy} onClick={() => void prepare()} className="rounded-md bg-violet-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Preparing…" : "Create preview"}</button>}
      {post && <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-violet-900">{post.status.replaceAll("_", " ")}</span>}
    </div>
    {post && <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
      {imageUrl && <img src={imageUrl} alt="Selected property for Instagram preview" className="aspect-square w-full rounded-lg object-cover" />}
      <div className="min-w-0">
        <label className="block text-xs font-bold text-slate-700">Caption (editable)
          <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2200} rows={7} disabled={post.status === "published" || busy} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900" />
        </label>
        <p className="mt-1 text-xs text-slate-500">{caption.length}/2200 characters</p>
        {post.status === "preview_ready" || post.status === "failed" ? <button type="button" disabled={busy} onClick={() => void publish()} className="mt-3 rounded-md bg-violet-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Publishing…" : "Publish to Instagram"}</button> : null}
        {post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-violet-900 underline">View Instagram post</a>}
      </div>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
    {post?.last_error && <p role="alert" className="mt-2 text-sm text-rose-700">{post.last_error}</p>}
  </section>;
}
