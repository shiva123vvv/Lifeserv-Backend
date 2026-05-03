const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { User } = require('../models');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // 🔍 DEBUG: Log token acquisition (temp)
            // console.log("AUTH HEADER:", req.headers.authorization);

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // First check User table
            req.user = await User.findByPk(decoded.id);
            
            // If not in User table, check Admin table
            if (!req.user) {
                const { Admin } = require('../models');
                req.user = await Admin.findByPk(decoded.id);
            }

            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Identity not recognized' });
            }

            next();
        } catch (error) {
            console.error("AUTH ERROR:", error.message);
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token",
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Not authorized, no token",
        });
    }
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`User role ${req.user.role} is not authorized to access this route`);
        }
        next();
    };
};

module.exports = { protect, authorize };
