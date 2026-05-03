const { Service } = require('./src/models');

const seedServices = async () => {
    const services = [
        { name: 'Cleaning', category: 'Home', description: 'Professional cleaning services' },
        { name: 'Plumbing', category: 'Home', description: 'Expert plumbing solutions' },
        { name: 'Electrician', category: 'Home', description: 'Certified electrical work' },
        { name: 'Carpenter', category: 'Home', description: 'Custom woodwork and repairs' },
        { name: 'Mechanic', category: 'Auto', description: 'Automotive maintenance' },
        { name: 'Driver', category: 'Transport', description: 'Professional driving services' },
        { name: 'Farmer', category: 'Agriculture', description: 'Agricultural services' }
    ];

    try {
        console.log('🌱 Seeding services...');
        for (const s of services) {
            await Service.findOrCreate({
                where: { name: s.name },
                defaults: s
            });
        }
        console.log('✅ Services seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedServices();
