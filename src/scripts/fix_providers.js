const { Provider, User } = require('../models');

async function fixProviders() {
  try {
    console.log('🔍 Checking for providers with NULL services...');
    
    const providers = await Provider.findAll({ include: [{ model: User, as: 'user' }] });
    
    for (const provider of providers) {
      if (!provider.services || provider.services.length === 0) {
        console.log(`🛠 Seeding services for provider: ${provider.user?.name || provider.id}`);
        
        // Sample services based on some logic or just generic ones
        const sampleServices = [
          { name: "Cleaning", experienceYears: "5", hourlyRate: "500", fixedRate: "" },
          { name: "Plumbing", experienceYears: "3", hourlyRate: "800", fixedRate: "" }
        ];
        
        await provider.update({ 
            services: sampleServices,
            isVerified: true, // Force verify for testing visibility
            verificationStatus: 'approved'
        });
      }
    }

    console.log('✅ Providers fixed and verified.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixProviders();
