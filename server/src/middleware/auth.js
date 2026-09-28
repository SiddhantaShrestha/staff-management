const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'dev_secret';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET(), { expiresIn: '8h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not logged in' });
  try {
    req.user = jwt.verify(token, SECRET());
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
