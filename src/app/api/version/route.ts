// The version this server is running; open tabs compare it with their own.
export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
