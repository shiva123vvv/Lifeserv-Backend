const { Provider, Service } = require('../models');
const logger = require('../utils/logger');

/**
 * 🛠 DATA NORMALIZATION SCRIPT: Service ID Recovery
 * Synchronizes provider JSON expertise with the master Service registry.
 */
async function syncProviderServices() {
    try {
        logger.info('🚀 Starting Service ID Synchronization...');
        
        const providers = await Provider.findAll();
        logger.info(`🔍 Found ${providers.length} providers to audit.`);

        let totalUpdated = 0;

        for (const provider of providers) {
            let services = provider.services;
            if (!services || !Array.isArray(services)) continue;

            let changed = false;
            const synchronizedServices = [];

            for (const s of services) {
                const normalizedName = String(s.name || "").trim();
                if (!normalizedName) continue;

                // 🛡️ Find or create in master registry
                let [serviceRecord] = await Service.findOrCreate({
                    where: { name: normalizedName },
                    defaults: {
                        name: normalizedName,
                        category: "Other",
                        isCustom: true,
                        isApproved: true
                    }
                });

                if (!s.id || s.id !== serviceRecord.id) {
                    changed = true;
                }

                synchronizedServices.push({
                    id: serviceRecord.id,
                    name: serviceRecord.name,
                    experienceYears: s.experienceYears || "0",
                    hourlyRate: s.hourlyRate || "0",
                    fixedRate: s.fixedRate || "0"
                });
            }

            if (changed) {
                provider.services = synchronizedServices;
                provider.changed('services', true);
                await provider.save();
                totalUpdated++;
                logger.info(`✅ Synced services for Provider ID: ${provider.id}`);
            }
        }

        logger.info(`✨ Synchronization Complete. Updated ${totalUpdated} providers.`);
    } catch (error) {
        logger.error(`❌ Sync Failed: ${error.message}`);
    }
}

module.exports = syncProviderServices;
