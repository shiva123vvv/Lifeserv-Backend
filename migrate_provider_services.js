const { Provider, Service } = require('./src/models');

const migrateProviderServices = async () => {
    try {
        console.log('🚀 Starting Provider Services Migration...');
        const providers = await Provider.findAll();
        
        console.log(`📊 Found ${providers.length} providers to process.`);

        for (const provider of providers) {
            let services = provider.services;
            if (!services) continue;

            if (typeof services === 'string') {
                try { services = JSON.parse(services); } catch { services = []; }
            }
            if (!Array.isArray(services)) continue;

            const synchronizedServices = [];
            let updated = false;

            for (const s of services) {
                const name = String(s.name || "").trim();
                if (!name) continue;

                // Find or create the service in the master registry
                const [serviceRecord] = await Service.findOrCreate({
                    where: { name: name },
                    defaults: {
                        name: name,
                        category: "Migrated",
                        isCustom: true,
                        isApproved: true
                    }
                });

                if (s.id !== serviceRecord.id) {
                    updated = true;
                }

                synchronizedServices.push({
                    id: serviceRecord.id,
                    name: serviceRecord.name,
                    experienceYears: s.experienceYears || "",
                    hourlyRate: s.hourlyRate || "",
                    fixedRate: s.fixedRate || ""
                });
            }

            if (updated) {
                provider.services = synchronizedServices;
                provider.changed('services', true);
                await provider.save();
                console.log(`✅ Updated provider: ${provider.id} (${synchronizedServices.length} services)`);
            }
        }

        console.log('🏁 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateProviderServices();
