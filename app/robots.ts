import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env/app-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/bookings/lookup"],
        disallow: [
          "/admin/",
          "/operator/",
          "/api/",
          "/bookings/",
          "/dashboard/",
          "/profile/",
          "/payment",
          "/confirmation",
          "/complete-payment",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
