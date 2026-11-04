import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isOwner } from "@/auth";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/writings";

// Hands the editor a short-lived token to upload one image straight from
// the browser to Vercel Blob (components/PostEditor.tsx). Files never pass
// through this server, so photos of any size fit, past the 4.5 MB a
// request to a Vercel function can carry.

/** writing/<post id>/<file name> */
const PATHNAME = /^writing\/\d+\/[\w.-]{1,120}$/;

export async function POST(request: Request) {
  if (!(await isOwner())) return Response.json({ error: "Not authorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Image storage isn't connected yet (BLOB_READ_WRITE_TOKEN is not set)." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATHNAME.test(pathname)) throw new Error("Invalid file name");
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          // A random suffix keeps every upload's URL unique, so it can be
          // cached for good.
          addRandomSuffix: true,
          cacheControlMaxAge: 365 * 24 * 60 * 60,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
