const { db } = require('./db');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function getEmployeeIdForUser(userId) {
  const [rows] = await db().query('SELECT id FROM employees WHERE user_id = ?', [userId]);
  return rows[0] ? rows[0].id : null;
}

function missing(body, fields) {
  return fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
}

function emptyToNull(v) {
  return v === '' || v === undefined ? null : v;
}

module.exports = { wrap, getEmployeeIdForUser, missing, emptyToNull };
