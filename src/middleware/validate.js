const Joi = require('joi');

/**
 * 🧪 INPUT VALIDATION SCHEMAS
 */

const schemas = {
    googleLogin: Joi.object({
        idToken: Joi.string().required(),
        role: Joi.string().valid('customer', 'provider', 'admin').default('customer')
    }),
    
    createBooking: Joi.object({
        serviceId: Joi.number().required(),
        providerId: Joi.number().required(),
        date: Joi.date().iso().required(),
        address: Joi.string().required(),
        totalPrice: Joi.number().positive().required()
    }),
    
    updateProfile: Joi.object({
        name: Joi.string().min(2).max(50),
        email: Joi.string().email(),
        photo: Joi.string().uri(),
        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
        bio: Joi.string().allow('', null),
        location: Joi.object().allow(null),
        services: Joi.array().allow(null),
        isVerified: Joi.boolean()
    }),

    updatePhone: Joi.object({
        phone: Joi.string().pattern(/^\d{10,15}$/).required().messages({
            'string.pattern.base': 'Phone number must be between 10-15 digits and contain only numbers'
        })
    })
};

/**
 * Validation Middleware
 */
const validate = (schemaName) => (req, res, next) => {
    const { error } = schemas[schemaName].validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    next();
};

module.exports = { validate };
