const dns = require('dns').promises;
const https = require('https');

/**
 * SENIOR NETWORK DIAGNOSTICS
 */
const NetworkChecker = {
    /**
     * Check if the machine has active internet access
     */
    async checkInternet() {
        return new Promise((resolve) => {
            https.get('https://www.google.com', (res) => {
                resolve(res.statusCode === 200);
            }).on('error', () => {
                resolve(false);
            });
        });
    },

    /**
     * Test DNS resolution for a specific host
     */
    async testDNS(host) {
        try {
            // Log attempt to specific system resolvers
            const addresses = await dns.lookup(host);
            return { ok: true, addresses };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    },

    /**
     * Parse DATABASE_URL safely
     */
    parseDbUrl(url) {
        if (!url) return null;
        try {
            const parsed = new URL(url);
            return {
                protocol: parsed.protocol,
                host: parsed.hostname,
                port: parsed.port,
                user: parsed.username,
                database: parsed.pathname.slice(1),
                sslmode: parsed.searchParams.get('sslmode')
            };
        } catch (e) {
            return null;
        }
    },

    /**
     * Mask password in DATABASE_URL for safe logging
     */
    maskUrl(url) {
        if (!url) return 'UNDEFINED';
        return url.replace(/\/\/.*:.*@/, '//****:****@');
    }
};

module.exports = NetworkChecker;
