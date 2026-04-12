const asyncHandler = require('express-async-handler');
const { Service, Provider, User, sequelize } = require('../models');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = asyncHandler(async (req, res) => {
    const services = await Service.findAll({
        where: { isApproved: true },
        order: [['name', 'ASC']]
    });
    res.json(services);
});

// @desc    Create a service
// @route   POST /api/services
// @access  Private
const createService = asyncHandler(async (req, res) => {
    const { name, category, icon, isCustom } = req.body;
    console.log('[ServiceController] Creating service:', { name, category });

    let normalizedCategory = (category || 'General').trim();
    normalizedCategory = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1).toLowerCase();

    const service = await Service.create({
        name,
        category: normalizedCategory,
        icon,
        isCustom: isCustom || false,
        isApproved: !isCustom,
        createdBy: req.user.role === 'provider' ? req.user.id : null
    });

    // Populate creator if exists
    const populatedService = await Service.findByPk(service.id, {
        include: [{
            model: Provider,
            as: 'creator',
            include: [{ model: User, as: 'user', attributes: ['name', 'photo'] }]
        }]
    });

    res.status(201).json(populatedService);
});

// @desc    Delete a service (Admin)
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = asyncHandler(async (req, res) => {
    const service = await Service.findByPk(req.params.id);

    if (service) {
        await service.destroy();
        res.json({ message: 'Service removed' });
    } else {
        res.status(404);
        throw new Error('Service not found');
    }
});

// @desc    Get unique normalized categories
// @route   GET /api/services/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    const services = await Service.findAll({
        attributes: [
            [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
        ],
        where: { isApproved: true }
    });

    let categories = services.map(s => {
        let cat = s.category || 'General';
        // Normalize: " design" -> "Design"
        cat = cat.trim();
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        return cat;
    });

    // Final unique set after normalization
    let uniqueCats = Array.from(new Set(categories)).filter(c => c).sort();

    // Fallback logic for UX stability
    if (uniqueCats.length === 0) {
        console.log('[ServiceController] No categories found in DB, using fallback defaults');
        uniqueCats = ['Cleaning', 'Plumbing', 'Electrical', 'Repairs', 'Maintenance', 'Business', 'Design', 'Development'];
    }

    console.log('[ServiceController] Returning categories:', uniqueCats.length);
    res.json(uniqueCats);
});

module.exports = { getServices, createService, deleteService, getCategories };
