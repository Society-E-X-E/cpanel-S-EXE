export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Solo POST' });
  }

  res.setHeader('Set-Cookie', 'authToken=; HttpOnly; Path=/; Max-Age=0; Secure=' + (process.env.NODE_ENV === 'production' ? 'true' : 'false') + '; SameSite=Strict');
  return res.status(200).json({ status: 'ok', message: 'Sesión cerrada' });
}
