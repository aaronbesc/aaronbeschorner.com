import { hasLocale } from "@/lib/i18n";
import { getPublishedPostBySlug } from "@/lib/posts";
import { SHARE_CACHE, storyImage } from "@/lib/share-image";

// A post as an Instagram story (see lib/share-image.tsx), for the Story
// share button (components/ShareButtons.tsx).

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return new Response("Not found", { status: 404 });
  const lang = new URL(request.url).searchParams.get("lang") ?? "en";
  const image = await storyImage(post, hasLocale(lang) ? lang : "en");
  image.headers.set("Cache-Control", SHARE_CACHE);
  return image;
}
