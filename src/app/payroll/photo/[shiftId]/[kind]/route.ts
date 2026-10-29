import type { NextRequest } from "next/server";
import { readShiftPhoto } from "@/lib/data";

// Time-in and time-out photos for the owner's review. Demo mode keeps them on
// disk, so they need a reader that checks who is asking; live mode hands out
// signed URLs from the private bucket and never reaches this route.
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/payroll/photo/[shiftId]/[kind]">,
) {
  const { shiftId, kind } = await context.params;
  if (kind !== "in" && kind !== "out") {
    return new Response("Not found", { status: 404 });
  }
  const bytes = await readShiftPhoto(shiftId, kind);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=60",
    },
  });
}
