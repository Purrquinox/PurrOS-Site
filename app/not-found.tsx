import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-muted">404</p>
        <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">It may have moved, or the feature may be turned off.</p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
