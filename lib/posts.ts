import { del, list } from "@vercel/blob";
import { unstable_cache } from "next/cache";
import { getPublishedPost, listPublishedPosts } from "@/lib/db";

// Server-side access to the writing page's posts.
//
// The public pages read published posts through a cache tagged POSTS_TAG,
// so they're served without a database query; the editor's save and
// delete actions expire the tag (updateTag) and the next visit sees the
// change. Only server code imports this file.

export const POSTS_TAG = "posts";

export const getPublishedPosts = unstable_cache(listPublishedPosts, ["published-posts"], {
  tags: [POSTS_TAG],
});

export const getPublishedPostBySlug = unstable_cache(getPublishedPost, ["published-post"], {
  tags: [POSTS_TAG],
});

/** Where a post's images are uploaded: writing/<id>/<file>. */
export const imageFolder = (postId: number) => `writing/${postId}/`;

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Deletes images from Vercel Blob. Best effort: a failure is logged, not
 * thrown, since the post itself has already been saved or deleted.
 */
export async function deleteImages(urls: string[]) {
  if (!urls.length || !blobConfigured()) return;
  try {
    await del(urls);
  } catch (error) {
    console.error("Couldn't delete images", error);
  }
}

/**
 * Deletes everything uploaded for a post, including images that were
 * uploaded but never saved into it.
 */
export async function deleteImageFolder(postId: number) {
  if (!blobConfigured()) return;
  try {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: imageFolder(postId), cursor });
      if (page.blobs.length) await del(page.blobs.map((blob) => blob.url));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (error) {
    console.error(`Couldn't delete the images of post ${postId}`, error);
  }
}
