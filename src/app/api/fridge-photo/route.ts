import { getCurrentUser } from "@/lib/auth";
import { identifyFoods, MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES } from "@/lib/gemini";

// POST /api/fridge-photo with up to three "photo" files → { foods: [...] }
// or { error: "..." }. Single Dish adds the foods to the user's list. The
// photos are passed straight to Gemini and never saved.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in to scan photos." }, { status: 401 });

  let photos: File[];
  try {
    const form = await request.formData();
    photos = form.getAll("photo").filter((p): p is File => p instanceof File);
  } catch {
    return Response.json({ error: "We couldn't read those photos. Please try again." }, { status: 400 });
  }

  if (photos.length === 0) return Response.json({ error: "Choose at least one photo." }, { status: 400 });
  if (photos.length > MAX_PHOTOS) {
    return Response.json({ error: `You can send up to ${MAX_PHOTOS} photos at a time.` }, { status: 400 });
  }
  if (photos.some((p) => !PHOTO_TYPES.includes(p.type))) {
    return Response.json({ error: "Please use JPG, PNG or WebP photos." }, { status: 400 });
  }
  if (photos.some((p) => p.size > MAX_PHOTO_BYTES)) {
    return Response.json({ error: "One of the photos is too large. Please try a smaller one." }, { status: 400 });
  }

  const result = await identifyFoods(
    await Promise.all(photos.map(async (p) => ({ type: p.type, bytes: await p.arrayBuffer() }))),
  );

  if (result.ok) return Response.json({ foods: result.foods });

  const messages = {
    not_configured: "Photo scanning isn't available right now. You can still type your list.",
    limit: "Photo scanning has reached its daily limit. Please try again tomorrow, or type your list.",
    failed: "We couldn't read your photos right now. Please try again, or type your list.",
  };
  return Response.json({ error: messages[result.reason] }, { status: result.reason === "limit" ? 429 : 503 });
}
