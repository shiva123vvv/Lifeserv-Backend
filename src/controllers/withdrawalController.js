const { PayoutMethod, Withdrawal, User, JobRequest, Provider, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * 💰 WITHDRAWAL CONTROLLER
 */

// POST /payout-method - Save or update payout method
exports.savePayoutMethod = async (req, res) => {
    try {
        const { type, accountNumber, ifsc, accountName, upiId, phoneNumber, provider } = req.body;
        const userId = req.user.id;

        // Validation
        if (type === 'bank') {
            if (!accountNumber || !ifsc || !accountName) {
                return res.status(400).json({ success: false, message: 'Account number, IFSC, and Name are required for bank transfer.' });
            }
        } else if (type === 'upi') {
            if (!upiId || !upiId.includes('@')) {
                return res.status(400).json({ success: false, message: 'Valid UPI ID is required.' });
            }
        } else if (type === 'phone') {
            if (!phoneNumber || !provider) {
                return res.status(400).json({ success: false, message: 'Phone number and Provider (GPay/PhonePe) are required.' });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payout type.' });
        }

        const [payoutMethod, created] = await PayoutMethod.upsert({
            userId,
            type,
            accountNumber,
            ifsc,
            accountName,
            upiId,
            phoneNumber,
            provider
        });

        res.status(200).json({
            success: true,
            message: 'Payout method saved successfully.',
            data: payoutMethod
        });
    } catch (error) {
        logger.error(`[savePayoutMethod] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to save payout method.' });
    }
};

// GET /payout-method - Get current payout method
exports.getPayoutMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const payoutMethod = await PayoutMethod.findOne({ where: { userId } });

        res.status(200).json({
            success: true,
            data: payoutMethod
        });
    } catch (error) {
        logger.error(`[getPayoutMethod] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch payout method.' });
    }
};

// POST /withdraw - Initiate withdrawal
exports.requestWithdrawal = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
        }

        // 1. Check if payout method exists
        const payoutMethod = await PayoutMethod.findOne({ where: { userId } });
        if (!payoutMethod) {
            return res.status(400).json({ success: false, message: 'No payout method found. Please add one before withdrawing.' });
        }

        // 2. Check balance (Dynamic Calculation)
        const provider = await Provider.findOne({ where: { userId } });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider profile missing.' });

        const earnings = await JobRequest.sum('price', {
            where: { providerId: provider.id, paymentStatus: 'paid' }
        }) || 0;

        const withdrawn = await Withdrawal.sum('amount', {
            where: { userId, status: ['pending', 'processing', 'paid'] }
        }) || 0;

        const available = parseFloat(earnings) - parseFloat(withdrawn);

        if (available < parseFloat(amount)) {
            return res.status(400).json({ success: false, message: 'Insufficient balance.' });
        }

        // 4. Create withdrawal request
        const withdrawal = await Withdrawal.create({
            userId,
            amount,
            status: 'pending'
        }, { transaction });

        // 5. Deduct balance (Lock it) - Optional if using dynamic, 
        // but we'll update user.balance just in case other parts use it
        const user = await User.findByPk(userId);
        user.balance = parseFloat(user.balance) - parseFloat(amount);
        await user.save({ transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Withdrawal initiated successfully. Status: Payment Initiated',
            data: withdrawal
        });
    } catch (error) {
        await transaction.rollback();
        logger.error(`[requestWithdrawal] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to initiate withdrawal.' });
    }
};

// GET /withdraw/latest - Get latest withdrawal
exports.getLatestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const withdrawal = await Withdrawal.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: withdrawal
        });
    } catch (error) {
        logger.error(`[getLatestWithdrawal] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch latest withdrawal.' });
    }
};

// GET /available-balance - Get dynamic available balance
exports.getAvailableBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const provider = await Provider.findOne({ where: { userId } });
        
        if (!provider) {
            return res.status(200).json({ success: true, availableBalance: 0 });
        }

        const earnings = await JobRequest.sum('price', {
            where: { providerId: provider.id, paymentStatus: 'paid' }
        }) || 0;

        const withdrawn = await Withdrawal.sum('amount', {
            where: { userId, status: ['pending', 'processing', 'paid'] }
        }) || 0;

        const available = Math.max(0, parseFloat(earnings) - parseFloat(withdrawn));

        res.status(200).json({
            success: true,
            availableBalance: available
        });
    } catch (error) {
        logger.error(`[getAvailableBalance] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to calculate balance.' });
    }
};

// GET /financial-summary - Get all financial metrics
exports.getFinancialSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const provider = await Provider.findOne({ where: { userId } });
        
        if (!provider) {
            return res.status(200).json({ 
                success: true, 
                totalEarnings: 0, 
                totalWithdrawn: 0, 
                availableBalance: 0 
            });
        }

        const totalEarnings = await JobRequest.sum('price', {
            where: { providerId: provider.id, paymentStatus: 'paid' }
        }) || 0;

        const totalWithdrawn = await Withdrawal.sum('amount', {
            where: { userId, status: ['pending', 'processing', 'paid'] }
        }) || 0;

        const availableBalance = Math.max(0, parseFloat(totalEarnings) - parseFloat(totalWithdrawn));

        res.status(200).json({
            success: true,
            totalEarnings: parseFloat(totalEarnings),
            totalWithdrawn: parseFloat(totalWithdrawn),
            availableBalance: availableBalance
        });
    } catch (error) {
        logger.error(`[getFinancialSummary] Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to generate financial summary.' });
    }
};
