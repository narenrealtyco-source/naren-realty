export function createPropertyVideoResponse(request: Request, video: Blob): Response {
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": 'inline; filename="property-video.mp4"',
    "Content-Security-Policy": "default-src 'none'; media-src 'self'; sandbox",
  });
  const range = request.headers.get("range");
  if (!range) {
    headers.set("Content-Length", String(video.size));
    return new Response(video, { status: 200, headers });
  }
  const match = /^bytes=(\\d*)-(\\d*)$/.exec(range.trim());
  if (!match || video.size === 0) {
    headers.set("Content-Range", `bytes */${video.size}`);
    return new Response(null, { status: 416, headers });
  }
  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      headers.set("Content-Range", `bytes */${video.size}`);
      return new Response(null, { status: 416, headers });
    }
    start = Math.max(0, video.size - suffixLength);
    end = video.size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : video.size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= video.size || end < start) {
    headers.set("Content-Range", `bytes */${video.size}`);
    return new Response(null, { status: 416, headers });
  }
  end = Math.min(end, video.size - 1);
  const chunk = video.slice(start, end + 1, "video/mp4");
  headers.set("Content-Length", String(chunk.size));
  headers.set("Content-Range", `bytes ${start}-${end}/${video.size}`);
  return new Response(chunk, { status: 206, headers });
}
