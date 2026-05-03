const Razorpay = require('razorpay');
const { JobRequest, Payment } = require('../models');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder',
});

// @desc    Create Razorpay order for job request
// @route   POST /api/v1/payments/create-order
const createOrder = asyncHandler(async (req, res) => {
    const { jobId } = req.body;
    console.log("💳 [PaymentController] Incoming Order Request for Job:", jobId);
    console.log("🔍 [PaymentController] Env Status - Key ID:", process.env.RAZORPAY_KEY_ID ? "PRESENT" : "MISSING");

    if (!jobId) {
        return res.status(400).json({ success: false, message: "Inquiry identifier (jobId) is mandatory" });
    }

    const job = await JobRequest.findByPk(jobId);

    if (!job) {
        return res.status(404).json({ success: false, message: "Professional engagement registry entry not found" });
    }

    // Security check: Only accepted jobs can be paid
    if (job.status !== "accepted") {
        return res.status(400).json({ success: false, message: "Engagements must be accepted by the specialist before initiating payment" });
    }

    const amountInPaise = Math.round(Number(job.totalAmount) * 100);
    console.log(`💰 [PaymentController] Calculating amount for Job ${job.id}: ₹${job.totalAmount} -> ${amountInPaise} paise`);

    if (!amountInPaise || amountInPaise <= 0) {
        return res.status(400).json({ success: false, message: "Engagement financial valuation is invalid" });
    }

    // 🛠️ FIX: Razorpay receipt length must be <= 40 chars
    // UUID (36) + "receipt_" (8) = 44 chars (Too long)
    const compactId = job.id.replace(/-/g, "").slice(0, 30);
    const receipt = `job_${compactId}`;
    
    console.log("📦 [PaymentController] Generated Razorpay Receipt:", receipt);

    if (receipt.length > 40) {
        return res.status(400).json({ success: false, message: "Internal Error: Payment receipt overflow" });
    }

    const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt,
        notes: {
            jobId: job.id,
            customerName: job.customerName
        }
    };

    try {
        const order = await razorpay.orders.create(options);
        console.log("✅ [PaymentController] Razorpay Order Synchronized:", order.id);
        res.json({ success: true, data: order, job });
    } catch (error) {
        console.error("❌ [PaymentController] Razorpay Order Creation Failure:", error);
        res.status(500).json({ 
            success: false, 
            message: error.error?.description || "Critical failure in payment gateway synchronization",
            error: error.message 
        });
    }
});

// @desc    Verify payment and update job status
// @route   POST /api/v1/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder')
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature === expectedSign) {
        const job = await JobRequest.findByPk(jobId);
        if (job) {
            job.paymentStatus = "paid";
            job.status = "ongoing";
            job.paidAt = new Date();
            await job.save();

            console.log("✅ Job after payment (Verify):", {
                id: job.id,
                status: job.status,
                paymentStatus: job.paymentStatus
            });

            if (job.status !== "ongoing") {
                throw new Error("Critical: Registry status transition to 'ongoing' failed after funding");
            }

            // 💾 SECURE PERSISTENCE: Save payment record linked to JobRequest
            console.log("💾 [PaymentController] Saving verified payment:", {
                jobRequestId: job.id,
                amount: job.totalAmount
            });

            await Payment.create({
                jobRequestId: job.id,
                transactionId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                amount: job.totalAmount,
                status: 'completed',
                paymentMethod: 'online'
            });

            return res.json({ success: true, message: "Payment verified successfully" });
        }
    }

    res.status(400);
    throw new Error('Invalid payment signature');
});

// @desc    Explicitly confirm payment success (backend driven)
// @route   POST /api/v1/payments/confirm
const confirmPayment = asyncHandler(async (req, res) => {
    const { jobId, transactionId, gateway = 'manual_sync' } = req.body;
    console.log(`💳 [PaymentController] Confirming payment for Job: ${jobId}, TX: ${transactionId}`);

    const job = await JobRequest.findByPk(jobId);
    if (!job) {
        res.status(404);
        throw new Error('Job reference not found in registry');
    }

    job.paymentStatus = "paid";
    job.status = "ongoing";
    job.paidAt = new Date();
    await job.save();

    console.log("✅ Job after payment (Confirm):", {
        id: job.id,
        status: job.status,
        paymentStatus: job.paymentStatus
    });

    if (job.status !== "ongoing") {
        throw new Error("Critical: Registry status transition to 'ongoing' failed during manual confirmation");
    }

    // 💾 SECURE PERSISTENCE: Save manual/sync payment record
    console.log("💾 [PaymentController] Synchronizing manual payment:", {
        jobRequestId: job.id,
        amount: job.totalAmount
    });

    await Payment.create({
        jobRequestId: job.id,
        transactionId,
        amount: job.totalAmount,
        status: 'completed',
        paymentMethod: gateway
    });

    res.json({ success: true, message: "Payment lifecycle synchronized" });
});

// @desc    Handle external payment webhooks (Stripe/Razorpay)
// @route   POST /api/v1/payments/webhook
const handleWebhook = asyncHandler(async (req, res) => {
    const { event, payload } = req.body;
    console.log("🔔 [PaymentController] Webhook received:", event);

    if (event === 'payment.captured' || event === 'order.paid') {
        const jobId = payload.order?.notes?.jobId || payload.payment?.entity?.notes?.jobId;
        if (jobId) {
            const job = await JobRequest.findByPk(jobId);
            if (job) {
                job.paymentStatus = "paid";
                job.status = "ongoing";
                job.paidAt = new Date();
                await job.save();
                console.log(`✅ [PaymentController] Job ${jobId} auto-paid & transitioned to ONGOING via webhook`);
            }
        }
    }

    res.json({ status: 'ok' });
});

module.exports = {
    createOrder,
    verifyPayment,
    confirmPayment,
    handleWebhook
};
