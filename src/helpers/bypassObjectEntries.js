export async function bypassObjectEntries(obj, callback) {
    if (Array.isArray(obj)) {
        return await Promise.all(obj.map(item => bypassObjectEntries(item, callback)));
    }

    if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = await bypassObjectEntries(value, callback);
        }
        await callback(obj, result);
        return result;
    }

    return obj;
}