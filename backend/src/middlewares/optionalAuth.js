const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const p = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: p.id, email: p.email, role: p.role, club_id: p.club_id ?? null };
    } catch (err) {
      console.warn('optionalAuth bad token:', err.message);
    }
  }
  next();
};
