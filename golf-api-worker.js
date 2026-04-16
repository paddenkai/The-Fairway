const GOLF_API_KEY = 'VMP53Q6WZANO5U72FFBOF77QY4';
const GOLF_API_BASE = 'https://api.golfcourseapi.com/v1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, '');
    const q = url.searchParams.get('q') || '';

    // Debug
    if (path === 'debug') {
      const apiUrl = `${GOLF_API_BASE}/search?search_query=${encodeURIComponent(q)}`;
      const resp = await fetch(apiUrl, {
        headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
      });
      const text = await resp.text();
      return new Response(
        JSON.stringify({ status: resp.status, apiUrl, body: text }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // Search — uses correct /v1/search endpoint with search_query param
    if (path === 'search') {
      if (!q || q.length < 2) {
        return new Response(JSON.stringify({ courses: [] }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }
      try {
        const apiUrl = `${GOLF_API_BASE}/search?search_query=${encodeURIComponent(q)}`;
        const resp = await fetch(apiUrl, {
          headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
        });
        const text = await resp.text();
        return new Response(text, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }
    }

    // Get course by ID
    if (path.startsWith('course/')) {
      const id = path.replace('course/', '');
      try {
        const resp = await fetch(`${GOLF_API_BASE}/courses/${id}`, {
          headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
        });
        const text = await resp.text();
        return new Response(text, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown route', path }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
};
