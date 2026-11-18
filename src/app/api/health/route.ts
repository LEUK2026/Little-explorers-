export async function GET() {
  return Response.json({ status: "ok", service: "little-explorers" }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
