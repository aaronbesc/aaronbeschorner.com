"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isOwner } from "@/auth";
import { createPost, deletePost, getPost, isDuplicate, updatePost } from "@/lib/db";
import { POSTS_TAG, deleteImageFolder, deleteImages } from "@/lib/posts";
import { PROFILE } from "@/lib/profile";
import { CATEGORIES, cleanPost, imagesOf, type Post } from "@/lib/writings";

// The writing editor's actions. Server actions are public endpoints, so
// each one checks the session and validates its input itself. Saving or
// deleting expires the public pages' cache (lib/posts.ts), so the change
// shows on the next visit.

async function requireOwner() {
  if (!(await isOwner())) throw new Error("Not authorized");
}

const isId = (id: unknown): id is number => Number.isSafeInteger(id) && (id as number) > 0;

/** Today in Madrid, as YYYY-MM-DD. */
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Starts a draft and opens it in the editor. */
export async function newPost() {
  await requireOwner();
  const id = await createPost({
    // A placeholder address until the post has a title.
    slug: `untitled-${Date.now().toString(36)}`,
    title: "Untitled",
    subtitle: "",
    author: PROFILE.name,
    date: today(),
    category: CATEGORIES[0].id,
    topic: "",
    cover: null,
    blocks: [{ id: "b0", type: "text", text: "" }],
    published: false,
  });
  redirect(`/admin/writing/${id}`);
}

export type SaveResult = { ok: true; post: Post } | { ok: false; error: string };

/**
 * Saves the whole post. Problems the author can fix come back as a
 * message, since thrown errors reach the browser without theirs.
 */
export async function savePost(id: unknown, input: unknown): Promise<SaveResult> {
  await requireOwner();
  if (!isId(id)) return { ok: false, error: "Invalid post." };
  const clean = cleanPost(input);
  if ("error" in clean) return { ok: false, error: clean.error };

  const before = await getPost(id);
  if (!before) return { ok: false, error: "This post no longer exists." };
  let saved: Post | null;
  try {
    saved = await updatePost(id, clean.post);
  } catch (error) {
    if (isDuplicate(error)) {
      return { ok: false, error: `Another post already uses /writing/${clean.post.slug}.` };
    }
    throw error;
  }
  if (!saved) return { ok: false, error: "This post no longer exists." };

  // Images taken out of the post are deleted from storage.
  const kept = new Set(imagesOf(saved).map((image) => image.url));
  await deleteImages(imagesOf(before).map((image) => image.url).filter((url) => !kept.has(url)));

  updateTag(POSTS_TAG);
  return { ok: true, post: saved };
}

/** Deletes a post and every image uploaded for it. */
export async function removePost(id: unknown) {
  await requireOwner();
  if (!isId(id)) throw new Error("Invalid id");
  if (await deletePost(id)) {
    await deleteImageFolder(id);
    updateTag(POSTS_TAG);
  }
  redirect("/admin/writing");
}
