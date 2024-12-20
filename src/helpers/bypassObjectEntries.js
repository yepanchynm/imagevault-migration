export function bypassObjectEntries(obj, key, value, callback) {
    if (Array.isArray(obj)) {
        return obj.map(item => bypassObjectEntries(item, key, value, callback));
    }
    if (typeof obj === 'object' && obj !== null) {
        if (obj[key] === value) {
            return callback(obj);
        }
        return Object.keys(obj).reduce((acc, _key) => {
            acc[_key] = bypassObjectEntries(obj[_key], key, value, callback);
            return acc;
        }, {});
    }
    return obj;
}