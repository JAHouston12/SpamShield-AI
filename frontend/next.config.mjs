const apiOrigin = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8417";
const onVercel = Boolean(process.env.VERCEL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel builds its own output; standalone is for the Docker image.
  ...(onVercel ? {} : { output: "standalone" }),
  async rewrites() {
    // On Vercel, /api/* is routed to the FastAPI service by vercel.json before it reaches Next.js.
    if (onVercel) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
