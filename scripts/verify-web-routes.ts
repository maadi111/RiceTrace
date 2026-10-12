async function testAllWebRoutes() {
  const routes = [
    "/login",
    "/dashboard",
    "/farmers",
    "/lots",
    "/lots/new",
    "/milling",
    "/lab-tests",
    "/shipments",
    "/buyers",
    "/settings",
    "/verify/CERT-2026-00003",
  ];

  console.log("Testing Next.js Web Routes Rendering:\n");
  for (const route of routes) {
    const res = await fetch(`http://localhost:3000${route}`);
    const html = await res.text();
    const hasBrand = html.includes("RiceTrace") || html.includes("ricetrace");
    console.log(`[Route] ${route.padEnd(30)} -> HTTP ${res.status} | Size: ${html.length.toString().padStart(6)} bytes | Branding Verified: ${hasBrand ? "YES" : "NO"}`);
    if (!res.ok) {
      throw new Error(`Route ${route} returned status ${res.status}`);
    }
  }
  console.log("\nAll web application routes rendered successfully with HTTP 200!");
}

testAllWebRoutes().catch((err) => {
  console.error("Web route verification failed:", err);
  process.exit(1);
});
