export default async function handler(req) {
  return new Response(JSON.stringify({ teste: 'funcionando', timestamp: Date.now() }), {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  });
}
