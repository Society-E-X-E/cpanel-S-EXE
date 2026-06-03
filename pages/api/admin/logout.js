export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Solo POST' });
  }

  const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `authToken=; HttpOnly; Path=/; Max-Age=0${secureCookie}; SameSite=Strict`);
  return res.status(200).json({ status: 'ok', message: 'Sesión cerrada' });
}
