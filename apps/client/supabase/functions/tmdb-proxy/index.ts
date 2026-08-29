const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const configuredKeys = [
    Deno.env.get('TMDB_API_TOKEN_v1'),
    Deno.env.get('TMDB_API_TOKEN_v2'),
  ].filter((key): key is string => Boolean(key?.trim()));
  const legacyKeys = (Deno.env.get('TMDB_API_KEYS') || Deno.env.get('TMDB_API_TOKEN') || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  const tmdbKeys = [...configuredKeys, ...legacyKeys].filter((key, index, arr) => arr.indexOf(key) === index);
  if (tmdbKeys.length === 0) {
    return new Response(JSON.stringify({ error: 'TMDB token not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { endpoint, params } = await req.json();

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Whitelist allowed endpoints
    const allowedPrefixes = [
      '/trending/', '/search/', '/discover/', '/movie/', '/tv/',
    ];
    if (!allowedPrefixes.some(p => endpoint.startsWith(p))) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('language', 'pt-BR');
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'string') url.searchParams.set(k, v);
      }
    }

    // Try every configured key in order. A 401/403/429 or transient 5xx
    // automatically fails over to the next key without exposing keys to clients.
    let lastStatus = 502;
    let lastData: any = { error: 'TMDB request failed' };
    for (const tmdbToken of tmdbKeys) {
      const requestUrl = new URL(url.toString());
      const isV4 = tmdbToken.startsWith('ey');
      const headers: Record<string, string> = { 'accept': 'application/json' };
      if (isV4) headers['Authorization'] = `Bearer ${tmdbToken}`;
      else requestUrl.searchParams.set('api_key', tmdbToken);

      try {
        const res = await fetch(requestUrl.toString(), { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        lastStatus = res.status;
        lastData = data;
        if (![401, 403, 429, 500, 502, 503, 504].includes(res.status)) break;
      } catch (fetchErr) {
        lastStatus = 502;
        lastData = { error: 'TMDB upstream unavailable' };
      }
    }

    return new Response(JSON.stringify(lastData), {
      status: lastStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
