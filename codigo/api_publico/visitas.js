/* Contador de visitas del tablero publico. Usa la API REST de Upstash
   directamente (sin instalar @vercel/kv ni ningun paquete): basta con
   que el proyecto tenga un storage tipo Redis conectado en Vercel, que
   inyecta las variables de entorno automaticamente. Se aceptan los dos
   nombres posibles segun como Vercel haya llamado la integracion. */
export const config = { runtime: "edge" };

export default async function handler() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return new Response(JSON.stringify({ visitas: null, error: "sin storage conectado" }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  try {
    const r = await fetch(url + "/incr/visitas_tablero", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await r.json();
    return new Response(JSON.stringify({ visitas: data.result }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ visitas: null, error: String(e) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}
