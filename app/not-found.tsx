import { SiteErrorShell } from "@/components/layout/SiteErrorShell";

export default function NotFound() {
  return (
    <SiteErrorShell
      statusCode="404"
      title="Page not found"
      description="The page you're looking for doesn't exist, may have moved, or the link might be incorrect."
    />
  );
}
