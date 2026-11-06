// server/lib/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '30d';

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(userId) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET이 .env에 없습니다.');
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET이 .env에 없습니다.');
  const payload = jwt.verify(token, JWT_SECRET);
  return payload.sub;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
