const GOLF_API_KEY = 'VMP53Q6WZANO5U72FFBOF77QY4';
const GOLF_API_BASE = 'https://api.golfcourseapi.com/v1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function fetchPage(url) {
  const resp = await fetch(url, {
    headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
  });
  if (!resp.ok) return null;
  return await resp.json();
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, '');
    const q = url.searchParams.get('q') || '';

    // Debug endpoint
    if (path === 'debug') {
      const apiUrl = `${GOLF_API_BASE}/courses?search=${encodeURIComponent(q)}`;
      const resp = await fetch(apiUrl, {
        headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
      });
      const text = await resp.text();
      return new Response(
        JSON.stringify({ status: resp.status, apiUrl, body: text }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    if (path === 'search') {
      // Fetch multiple pages and return all courses so client can filter
      // The API doesn't reliably filter by search term, so we grab pages 1-3
      const pages = [1, 2, 3, 4, 5];
      const allCourses = [];

      for (const page of pages) {
        const apiUrl = `${GOLF_API_BASE}/courses?search=${encodeURIComponent(q)}&page=${page}`;
        try {
          const data = await fetchPage(apiUrl);
          if (!data) break;
          const courses = data.courses || data.results || [];
          if (!courses.length) break;
          allCourses.push(...courses);
          // If this page wasn't full (less than 20), no more pages
          if (courses.length < 20) break;
        } catch(e) {
          break;
        }
      }

      return new Response(JSON.stringify({ courses: allCourses }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    if (path.startsWith('course/')) {
      const id = path.replace('course/', '');
      const apiUrl = `${GOLF_API_BASE}/courses/${id}`;
      try {
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
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown route', path }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
};
