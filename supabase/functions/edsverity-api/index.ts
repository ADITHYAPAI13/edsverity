// Public health check only. No access to private data or elevated keys.
Deno.serve((req: Request) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') return new Response('Method not allowed', { status: 405 });
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://adithyapai13.github.io', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  return new Response(req.method === 'OPTIONS' ? null : JSON.stringify({ platform: 'EdsVerity', status: 'online' }), { status: 200, headers });
});
