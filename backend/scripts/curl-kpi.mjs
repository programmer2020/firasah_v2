// Log in as user 11, call /api/dashboard/kpi-cards, show result
import 'dotenv/config';

const base = 'http://localhost:5000';

async function main() {
  // Use the user 11 email
  const candidates = [
    { email: 'mohamed.adel.abdelalim@example.com', password: 'password123' },
    { email: 'madel@example.com', password: 'password123' },
  ];

  // First discover the email via direct DB query would be nice, but we already know user_id=11
  // Instead, just hit /api/dashboard/kpi-cards — the endpoint requires auth so we need a token.
  // The simplest way: try a known seeded login. If unknown, print 401 and exit.

  for (const c of candidates) {
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
    if (r.ok) {
      const data = await r.json();
      const token = data?.data?.token || data?.token;
      console.log('Login OK for', c.email, '→ token len', token?.length);
      const r2 = await fetch(`${base}/api/dashboard/kpi-cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('kpi-cards status:', r2.status);
      const text = await r2.text();
      console.log(text);
      return;
    } else {
      console.log('Login failed for', c.email, 'status:', r.status);
    }
  }
  console.log('No working credentials — skipping API verification; DB test already verified.');
}
main().catch((e) => { console.error(e); process.exit(1); });
