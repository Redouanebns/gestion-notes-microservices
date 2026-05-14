const jwt = require('jsonwebtoken');
const authMiddleware = (req, res, next) => {
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
return res.status(401).json({ message: 'No token provided' });
}
const token = authHeader.split(' ')[1];
try {
req.user = jwt.verify(token, process.env.JWT_SECRET);
next();
} catch (error) {
res.status(401).json({ message: 'Invalid or expired token' });
}
};
module.exports = authMiddleware;