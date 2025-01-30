export async function bypassObjectEntries(obj, key, value, callback) {
    if (Array.isArray(obj)) {
        const result = await Promise.all(obj.map(item => bypassObjectEntries(item, key, value, callback)));
        return result;
    }

    if (typeof obj === 'object' && obj !== null) {
        if (obj[key] === value) {
            return await callback(obj);
        }

        const result = {};
        for (const _key of Object.keys(obj)) {
            result[_key] = await bypassObjectEntries(obj[_key], key, value, callback);
        }
        return result;
    }

    return obj;
}
