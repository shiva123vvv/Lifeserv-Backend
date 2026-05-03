const asyncHandler = require('express-async-handler');
const { Service, Provider, User, sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const cacheService = require('../services/cacheService');

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
const getServices = asyncHandler(async (req, res) => {
    const { page, size } = req.query;
    const cacheKey = `services_p${page || 1}_s${size || 10}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
        return res.json({ success: true, data: cached });
    }

    const { limit, offset } = getPagination(page, size);

    const data = await Service.findAndCountAll({
        where: { isApproved: true },
        limit,
        offset,
        order: [['name', 'ASC']]
    });

    const response = getPagingData(data, page, limit);
    cacheService.set(cacheKey, response);

    res.json({
        success: true,
        data: response
    });
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

    // Invalidate Cache
    cacheService.invalidatePattern('services_');
    cacheService.del('service_categories');

    // Populate creator if exists
    const populatedService = await Service.findByPk(service.id, {
        include: [{
            model: Provider,
            as: 'creator',
            include: [{ model: User, as: 'user', attributes: ['name', 'photo'] }]
        }]
    });

    res.status(201).json({
        success: true,
        data: populatedService
    });
});

// @desc    Delete a service (Admin)
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
const deleteService = asyncHandler(async (req, res) => {
    const service = await Service.findByPk(req.params.id);

    if (service) {
        await service.destroy();
        cacheService.invalidatePattern('services_');
        cacheService.del('service_categories');
        res.json({ success: true, message: 'Service removed' });
    } else {
        res.status(404);
        throw new Error('Service not found');
    }
});

// @desc    Get unique normalized categories
// @route   GET /api/v1/services/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    const cacheKey = 'service_categories';
    const cached = cacheService.get(cacheKey);
    if (cached) {
        return res.json({ success: true, data: cached });
    }

    const services = await Service.findAll({
        attributes: [
            [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
        ],
        where: { isApproved: true }
    });

    let categories = services.map(s => {
        let cat = s.category || 'General';
        cat = cat.trim();
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        return cat;
    });

    let uniqueCats = Array.from(new Set(categories)).filter(c => c).sort();

    if (uniqueCats.length === 0) {
        uniqueCats = ['Cleaning', 'Plumbing', 'Electrical', 'Repairs', 'Maintenance', 'Business', 'Design', 'Development'];
    }

    cacheService.set(cacheKey, uniqueCats, 3600); // Cache for 1 hour

    res.json({
        success: true,
        data: uniqueCats
    });
});

module.exports = { getServices, createService, deleteService, getCategories };
