"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../lib/supabase-service";

type PostRow = {
  id: string; property_id: string; status: string; caption: string; image_path: string;
  container_id: string | null; permalink: string | null; last_error: string | null; media_token: string;
};

function cleanError(value: unknown): string {
  return value instanceof Error ? value.message.slice(0, 500) : "Instagram publishing failed.";
}

export async function createInstagramPreview(propertyId: string): Promise<PostRow> {
  const { supabase, user } = await requireAdmin();
  const journal = createSupabaseServiceClient();
  const id = propertyId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid property ID.");

  const { data: property, error } = await supabase.from("properties")
    .select("id,title,category,locality,price,status,photos")
    .eq("id", id).maybeSingle();
  if (error || !property) throw new Error("Property could not be loaded.");
  if (String(property.status).toLowerCase() !== "approved") throw new Error("Only approved properties can be prepared for Instagram.");
  if (String(property.category).toLowerCase() !== "resale") throw new Error("Instagram auto-post is currently limited to sale/resale properties.");
  if (!Array.isArray(property.photos) || typeof property.photos[0] !== "string") throw new Error("This property has no approved public photo.");

  const imagePath = property.photos[0] as string;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://naren-realty-fw7y.vercel.app").replace(/\/$/, "");
  const caption = [
    property.title,
    property.locality,
    `Price: ₹${Number(property.price).toLocaleString("en-IN")}`,
    "For details and enquiries, visit our website.",
    `${siteUrl}/properties/${id}`,
    `#NarenRealty #PropertyForSale #RealEstate #${String(property.locality).replace(/[^a-z0-9]/gi, "")}`,
  ].join("\n\n").slice(0, 2200);

  const { data: existing, error: existingError } = await journal.from("instagram_property_posts")
    .select("*").eq("property_id", id).maybeSingle();
  if (existingError) throw new Error("Instagram post storage is not ready. Apply the Instagram post migration first.");
  if (existing && !["failed", "cancelled"].includes(existing.status)) return existing as PostRow;

  const payload = { property_id: id, created_by: user.id, status: "preview_ready", caption, image_path: imagePath, container_id: null, permalink: null, last_error: null };
  const query = existing
    ? journal.from("instagram_property_posts").update(payload).eq("id", existing.id)
    : journal.from("instagram_property_posts").insert(payload);
  const { data: post, error: saveError } = await query.select("id,property_id,status,caption,image_path,container_id,permalink,last_error").single();
  if (saveError || !post) throw new Error("Could not save Instagram preview. Verify the migration and Admin database permissions.");
  revalidatePath("/admin/properties");
  return post as PostRow;
}

export async function publishInstagramPreview(postId: string, captionInput: string): Promise<{ permalink: string | null }> {
  const { supabase } = await requireAdmin();
  const journal = createSupabaseServiceClient();
  const { data: post, error: loadError } = await journal.from("instagram_property_posts")
    .select("*").eq("id", postId).maybeSingle();
  if (loadError || !post) throw new Error("Instagram preview could not be loaded.");
  if (post.status === "published") return { permalink: post.permalink };
  if (!["preview_ready", "failed"].includes(post.status)) throw new Error("This post is already being processed.");
  const caption = captionInput.trim();
  if (!caption || caption.length > 2200) throw new Error("Caption must contain 1–2,200 characters.");

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const version = process.env.INSTAGRAM_GRAPH_API_VERSION;
  if (!token || !accountId || !version || !/^v\d+\.\d+$/.test(version)) {
    throw new Error("Instagram is not connected yet. Configure INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID and INSTAGRAM_GRAPH_API_VERSION in Vercel.");
  }

  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("status,category").eq("id", post.property_id).maybeSingle();
  if (propertyError || !property || String(property.status).toLowerCase() !== "approved" || String(property.category).toLowerCase() !== "resale") {
    throw new Error("Only currently approved sale properties can be published.");
  }

  const { data: locked, error: lockError } = await journal.from("instagram_property_posts")
    .update({ status: "publishing", caption, last_error: null }).eq("id", postId)
    .in("status", ["preview_ready", "failed"]).select("id").maybeSingle();
  if (lockError || !locked) throw new Error("Could not reserve this post for publishing. Refresh and try again.");
  const base = `https://graph.instagram.com/${version}`;
  let confirmedMediaId: string | null = null;
  try {
    let containerId = post.container_id as string | null;
    if (!containerId) {
      const form = new URLSearchParams({
        image_url: (process.env.NEXT_PUBLIC_SITE_URL || "https://naren-realty-fw7y.vercel.app").replace(/\/$/, "") + "/api/instagram/media/" + post.id + "?token=" + encodeURIComponent(post.media_token),
        caption,
        access_token: token,
      });
      const createResponse = await fetch(`${base}/${accountId}/media`, { method: "POST", body: form, cache: "no-store" });
      const created = await createResponse.json() as { id?: string; error?: { message?: string } };
      if (!createResponse.ok || !created.id) throw new Error(created.error?.message || "Instagram media container could not be created.");
      containerId = created.id;
      const { error: containerSaveError } = await journal.from("instagram_property_posts")
        .update({ container_id: containerId }).eq("id", postId);
      if (containerSaveError) throw new Error("Instagram container was created but could not be saved. Contact support before retrying.");
    }

    let ready = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const statusResponse = await fetch(`${base}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const statusData = await statusResponse.json() as { status_code?: string; error?: { message?: string } };
      if (!statusResponse.ok) throw new Error(statusData.error?.message || "Instagram media status check failed.");
      if (statusData.status_code === "FINISHED") { ready = true; break; }
      if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") throw new Error("Instagram could not process the selected image.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!ready) throw new Error("Instagram image is still processing. Retry from Admin after a short wait.");

    const publishForm = new URLSearchParams({ creation_id: containerId, access_token: token });
    const publishResponse = await fetch(`${base}/${accountId}/media_publish`, { method: "POST", body: publishForm, cache: "no-store" });
    const published = await publishResponse.json() as { id?: string; error?: { message?: string } };
    if (!publishResponse.ok || !published.id) throw new Error(published.error?.message || "Instagram did not confirm publication.");

    const permalinkResponse = await fetch(`${base}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const media = await permalinkResponse.json() as { permalink?: string };
    const permalink = media.permalink ?? null;
    const { error: updateError } = await supabase.from("instagram_property_posts")
      .update({ status: "published", ig_media_id: published.id, permalink, published_at: new Date().toISOString(), last_error: null })
      .eq("id", postId);
    if (updateError) throw new Error("Instagram published the post, but the Admin status could not be saved. Do not republish; contact support.");
    revalidatePath("/admin/properties");
    return { permalink };
  } catch (error) {
    const message = cleanError(error);
    await supabase.from("instagram_property_posts").update({ status: "failed", last_error: message }).eq("id", postId);
    revalidatePath("/admin/properties");
    throw new Error(message);
  }
}
