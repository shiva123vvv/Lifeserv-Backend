const { JobRequest, Provider, User, Service } = require('../models');
const asyncHandler = require('express-async-handler');

// @desc    Create a new job request
// @route   POST /api/v1/job-requests
const createJobRequest = asyncHandler(async (req, res) => {
    // 🔥 DEBUG LOG
    console.log("📥 [JobRequestController] Incoming inquiry request:", req.body);

    const { 
        providerId, 
        serviceId, 
        pricingType, 
        hours, 
        price, 
        location, 
        scheduledAt,
        customerName,
        customerPhone,
        description
    } = req.body;

    console.log("📥 Incoming Description:", description);

    if (!providerId || !serviceId || !pricingType || !price) {
        res.status(400);
        throw new Error('Missing required fields for job engagement (providerId, serviceId, pricingType, or price)');
    }

    // 🛡️ BACKEND DEFENSE: Validate serviceId is a valid UUID before querying
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (serviceId === "unknown" || !uuidRegex.test(serviceId)) {
        res.status(400);
        throw new Error('Invalid service ID format. A valid UUID is required.');
    }

    // Validate serviceId exists in services table
    let serviceExists;
    try {
        serviceExists = await Service.findByPk(serviceId);
    } catch (error) {
        console.error("Critical: UUID Validation Bypass in DB Query", error);
        res.status(400);
        throw new Error('Malformed service identifier rejected by registry');
    }

    if (!serviceExists) {
        res.status(400);
        throw new Error('Selected service is invalid or does not exist in the service registry');
    }

    if (pricingType === "hourly" && !hours) {
        res.status(400);
        throw new Error('Hours are required for hourly pricing engagements');
    }

    const baseAmount = pricingType === "hourly" ? Number(hours) * Number(price) : Number(price);
    const serviceFee = baseAmount * 0.02;
    const totalAmount = baseAmount + serviceFee;

    const job = await JobRequest.create({
        customerId: req.user.id,
        providerId,
        serviceId,
        pricingType,
        hours: pricingType === "hourly" ? hours : 0,
        price: baseAmount, // 🔥 FIX: Store the total base amount (e.g. 1000 * 2 = 2000)
        serviceFee,
        totalAmount,
        location,
        scheduledAt,
        customerName,
        customerPhone,
        description,
        paymentStatus: "pending",
        status: "pending"
    });

    console.log("💾 [JobRequestController] Saved Job to Registry:", job.id);


    // 🛡️ SECURE RESPONSE: Mask phone number in creation response
    const jobData = job.toJSON();
    console.log("💾 [JobRequestController] Job before masking (Create):", jobData.id);
    
    if (jobData.paymentStatus !== 'paid') {
        jobData.customerPhone = "🔒 Contact hidden until payment";
    }

    console.log("📤 [JobRequestController] Job after masking (Create):", jobData.customerPhone);
    res.status(201).json({ success: true, data: jobData });
});

// @desc    Respond to job request (Accept/Reject)
// @route   PATCH /api/v1/job-requests/:id/respond
const respondToJobRequest = asyncHandler(async (req, res) => {
    const { action } = req.body;
    const job = await JobRequest.findByPk(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job request not found');
    }

    // Verify provider owns this job
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider || job.providerId !== provider.id) {
        res.status(403);
        throw new Error('Not authorized to respond to this request');
    }

    if (action === "accept") {
        job.status = "accepted";
    } else if (action === "reject") {
        job.status = "rejected";
    } else {
        res.status(400);
        throw new Error('Invalid action. Use accept or reject.');
    }

    await job.save();

    // 🛡️ SECURE RESPONSE: Mask phone number in response
    const jobData = job.toJSON();
    if (jobData.paymentStatus !== 'paid') {
        jobData.customerPhone = "🔒 Contact hidden until payment";
    }

    res.json({ success: true, data: jobData });
});

// @desc    Get job requests for provider
// @route   GET /api/v1/job-requests/provider
const getProviderJobRequests = asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider) {
        res.status(404);
        throw new Error('Provider profile not found');
    }

    const requests = await JobRequest.findAll({
        where: { providerId: provider.id },
        include: [
            { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
            { model: Service, as: 'service', attributes: ['id', 'name', 'description'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    // 🛡️ SELF-HEALING: Auto-transition paid jobs to 'ongoing' if stuck
    for (let job of requests) {
        if (job.paymentStatus === 'paid' && job.status === 'accepted') {
            console.log(`🔧 [AutoFix] Transitioning funded job ${job.id} to ONGOING`);
            job.status = 'ongoing';
            await job.save();
        }
    }

    // 🛡️ SECURE RESPONSE: Mask phone numbers if not paid
    const secureRequests = requests.map(job => {
        const item = job.toJSON();
        if (item.paymentStatus !== 'paid') {
            item.customerPhone = "🔒 Contact hidden until payment";
            if (item.customer) item.customer.phone = "🔒 Contact hidden until payment";
        }
        return item;
    });

    console.log(`📤 [JobRequestController] Sending ${secureRequests.length} inquiries (Phone Masking Active)`);
    res.json({ success: true, data: secureRequests });
});

// @desc    Get job requests for customer
// @route   GET /api/v1/job-requests/customer
const getCustomerJobRequests = asyncHandler(async (req, res) => {
    const requests = await JobRequest.findAll({
        where: { customerId: req.user.id },
        include: [
            { model: Provider, as: 'provider', include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }] },
            { model: Service, as: 'service', attributes: ['id', 'name', 'description'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    // 🛡️ SELF-HEALING: Auto-transition paid jobs to 'ongoing' if stuck
    for (let job of requests) {
        if (job.paymentStatus === 'paid' && job.status === 'accepted') {
            console.log(`🔧 [AutoFix] Transitioning funded job ${job.id} to ONGOING (Customer Side)`);
            job.status = 'ongoing';
            await job.save();
        }
    }

    // 🛡️ SECURE RESPONSE: Mask provider phone if not paid
    const secureRequests = requests.map(job => {
        const item = job.toJSON();
        console.log("📤 Sending Job Data to Customer:", { id: item.id, status: item.status, pay: item.paymentStatus });
        if (item.paymentStatus !== 'paid' && item.provider && item.provider.user) {
            item.provider.user.phone = "🔒 Contact hidden until payment";
        }
        return item;
    });

    console.log(`📤 [JobRequestController] Sending ${secureRequests.length} deployments to customer`);
    res.json({ success: true, data: secureRequests });
});

// @desc    Accept a job request
// @route   PATCH /api/v1/job-requests/:id/accept
const acceptJobRequest = asyncHandler(async (req, res) => {
    console.log("📥 [JobRequestController] Accept API hit:", req.params.id);
    const job = await JobRequest.findByPk(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job request not found');
    }

    // Verify provider owns this job
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider || job.providerId !== provider.id) {
        res.status(403);
        throw new Error('Not authorized to respond to this request');
    }

    job.status = "accepted";
    await job.save();

    // 🛡️ SECURE RESPONSE: Mask phone number in response
    const jobData = job.toJSON();
    console.log("💾 [JobRequestController] Job before masking (Accept):", jobData.id);

    if (jobData.paymentStatus !== 'paid') {
        jobData.customerPhone = "🔒 Contact hidden until payment";
    }

    console.log("📤 [JobRequestController] Job after masking (Accept):", jobData.customerPhone);
    res.json({ success: true, data: jobData });
});

// @desc    Reject a job request
// @route   PATCH /api/v1/job-requests/:id/reject
const rejectJobRequest = asyncHandler(async (req, res) => {
    console.log("📥 [JobRequestController] Reject API hit:", req.params.id);
    const job = await JobRequest.findByPk(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job request not found');
    }

    // Verify provider owns this job
    const provider = await Provider.findOne({ where: { userId: req.user.id } });
    if (!provider || job.providerId !== provider.id) {
        res.status(403);
        throw new Error('Not authorized to respond to this request');
    }

    job.status = "rejected";
    await job.save();

    res.json({ success: true, data: job });
});

// @desc    Mark a job request as completed (Dual Confirmation)
// @route   PATCH /api/v1/job-requests/:id/complete
const completeJobRequest = asyncHandler(async (req, res) => {
    console.log("📥 [JobRequestController] Dual-Confirmation API hit:", req.params.id);
    const job = await JobRequest.findByPk(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job request not found');
    }

    // Safety: Ensure payment is already processed
    if (job.paymentStatus !== 'paid') {
        res.status(400);
        throw new Error('Completion blocked: Engagement must be funded before finalization');
    }

    if (job.status !== 'ongoing' && job.status !== 'accepted') {
        res.status(400);
        throw new Error('Only active engagements can be marked as completed');
    }

    const userId = req.user.id;
    let role = null;

    // Identify user role in this engagement
    if (userId === job.customerId) {
        role = 'customer';
        job.customerCompleted = true;
        console.log(`✅ [JobRequestController] Customer ${userId} confirmed completion`);
    } else {
        const provider = await Provider.findOne({ where: { userId: userId } });
        if (provider && job.providerId === provider.id) {
            role = 'provider';
            job.providerCompleted = true;
            console.log(`✅ [JobRequestController] Specialist ${provider.id} confirmed completion`);
        }
    }

    if (!role) {
        res.status(403);
        throw new Error('Not authorized to finalize this engagement');
    }

    // Mutually Verified Completion Check
    if (job.customerCompleted && job.providerCompleted) {
        console.log(`🏆 [JobRequestController] Dual-Confirmation Success for Job ${job.id}. Archiving...`);
        
        const { sequelize } = require('../models');
        await sequelize.transaction(async (t) => {
            job.status = "completed";
            await job.save({ transaction: t });

            // 💰 DISBURSEMENT: Credit specialist earnings & Update Stats (Base Price only)
            const baseEarned = Number(job.price);
            await Provider.increment(
                { totalEarnings: baseEarned, totalJobs: 1 },
                { where: { id: job.providerId }, transaction: t }
            );
            console.log(`💸 Finalized Job: ${job.id}. Released net earnings of ₹${baseEarned} (Platform fee of ₹${job.serviceFee} retained)`);
        });
    } else {
        await job.save();
    }

    res.json({ success: true, data: job });
});

module.exports = {
    createJobRequest,
    respondToJobRequest,
    acceptJobRequest,
    rejectJobRequest,
    getProviderJobRequests,
    getCustomerJobRequests,
    completeJobRequest
};
