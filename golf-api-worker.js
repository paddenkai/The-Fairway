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
    const lat = url.searchParams.get('lat') || '';
    const lng = url.searchParams.get('lng') || '';
    const radius = url.searchParams.get('radius') || '25';

    // Debug endpoint - pass any params through
    if (path === 'debug') {
      const apiUrl = `${GOLF_API_BASE}/courses?${url.searchParams.toString()}`;
      const resp = await fetch(apiUrl, {
        headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
      });
      const text = await resp.text();
      return new Response(
        JSON.stringify({ status: resp.status, apiUrl, body: text }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // Nearby courses by GPS
    if (path === 'nearby') {
      // Try different param formats the API might support
      const attempts = [
        `${GOLF_API_BASE}/courses?latitude=${lat}&longitude=${lng}&radius=${radius}`,
        `${GOLF_API_BASE}/courses?lat=${lat}&lng=${lng}&radius=${radius}`,
        `${GOLF_API_BASE}/courses?lat=${lat}&lon=${lng}&radius_km=${radius}`,
      ];

      for (const apiUrl of attempts) {
        try {
          const resp = await fetch(apiUrl, {
            headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            const courses = data.courses || data.results || data.data || [];
            if (courses.length > 0) {
              return new Response(JSON.stringify({ courses, source: apiUrl }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...CORS }
              });
            }
          }
        } catch(e) {}
      }

      // Fallback: return empty so the app knows location search isn't supported
      return new Response(JSON.stringify({ courses: [], supported: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // Text search - fetch multiple pages, client will filter
    if (path === 'search') {
      const allCourses = [];
      for (let page = 1; page <= 5; page++) {
        try {
          const apiUrl = `${GOLF_API_BASE}/courses?search=${encodeURIComponent(q)}&page=${page}`;
          const resp = await fetch(apiUrl, {
            headers: { 'Authorization': `Key ${GOLF_API_KEY}` }
          });
          if (!resp.ok) break;
          const data = await resp.json();
          const courses = data.courses || data.results || [];
          if (!courses.length) break;
          allCourses.push(...courses);
          if (courses.length < 20) break;
        } catch(e) { break; }
      }
      return new Response(JSON.stringify({ courses: allCourses }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

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
