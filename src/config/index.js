const isProduction = process.env.NODE_ENV === "production";

const CONFIG = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  ENABLE_DISCOVERY: process.env.ENABLE_DISCOVERY === "true",
  HOST: "0.0.0.0",
  BASE_URL: `http://${process.env.LOCAL_IP || 'localhost'}:${process.env.PORT || 5000}`
};

module.exports = { CONFIG, isProduction };
