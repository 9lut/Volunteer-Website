module.exports = function authorize(allowedRoles = []) {
      return (req, res, next) => {
            if (!req.user?.role) {
                  return res.status(401).json({ message: 'Unauthenticated' });
            }
            if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
                  return res.status(403).json({ message: 'Forbidden' });
            }
            next();
      };
};
