// pages/api/robots.js
export default function handler(req, res) {
  const robotsTxt = `
User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /
Crawl-delay: 1

Disallow: /api/
Disallow: /admin/
Disallow: /private/

Sitemap: ${process.env.NEXTAUTH_URL || 'https://191413.ai'}/sitemap.xml
  `.trim();

  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsTxt);
}