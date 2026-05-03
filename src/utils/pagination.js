/**
 * 📊 PAGINATION UTILITY
 * Standardizes page and limit handling across the API.
 */
const getPagination = (page, size) => {
    const limit = size ? Math.max(1, Math.min(+size, 100)) : 10;
    const p = page ? Math.max(1, +page) : 1;
    const offset = (p - 1) * limit;
  
    return { limit, offset };
};

const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows: items } = data;
    const currentPage = page ? +page : 1;
    const totalPages = Math.ceil(totalItems / limit);
  
    return { totalItems, items, totalPages, currentPage };
};

module.exports = { getPagination, getPagingData };
