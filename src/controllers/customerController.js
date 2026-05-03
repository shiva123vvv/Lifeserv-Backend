const asyncHandler = require('express-async-handler');
const { User, Booking } = require('../models');

// @desc    Get customer profile
// @route   GET /api/v1/customers/profile
// @access  Private (Customer)
const getCustomerProfile = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'phone', 'role', 'photo', 'address']
    });

    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update customer profile
// @route   PUT /api/v1/customers/profile
// @access  Private (Customer)
const updateCustomerProfile = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone;
        user.address = req.body.address || user.address;

        const updatedUser = await user.save();

        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                address: updatedUser.address
            }
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = { getCustomerProfile, updateCustomerProfile };

