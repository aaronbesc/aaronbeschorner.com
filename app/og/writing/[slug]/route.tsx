import { hasLocale } from "@/lib/i18n";
import { getPublishedPostBySlug } from "@/lib/posts";
import { SHARE_CACHE, linkImage } from "@/lib/share-image";

// A post's link preview (see lib/share-image.tsx). Pages link it as
// ?lang=<lang>&v=<version>, so an edited post gets a new URL that LinkedIn,
// WhatsApp and the rest fetch again.

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return new Response("Not found", { status: 404 });
  const lang = new URL(request.url).searchParams.get("lang") ?? "en";
  const image = await linkImage(post, hasLocale(lang) ? lang : "en");
  image.headers.set("Cache-Control", SHARE_CACHE);
  return image;
}
