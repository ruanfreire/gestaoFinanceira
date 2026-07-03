#!/usr/bin/env node
const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error('Usage: node test-login.mjs <email> <password>');
  process.exit(1);
}
const res = await fetch('http://127.0.0.1:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const body = await res.json();
if (!res.ok) {
  console.log('FAIL', res.status, body.message || body);
  process.exit(1);
}
const org = body.user?.organization;
console.log('OK', email, '→ org:', org?.slug, org?.name, '| notas tenant fixable');
console.log('roles:', body.user?.roles?.join(','), 'status:', body.user?.status);
