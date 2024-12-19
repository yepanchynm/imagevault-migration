export async function bypassObjectEntries(obj, key, value, callback) {
    let results = [];

    async function search(item, parent) {
        if (Array.isArray(item)) {
            for (const value of item) {
                await search(value, item)
            }
        } else if (item && typeof item === "object") {
            if (item[key] === value) {
                results.push(item);
                if (typeof callback === "function") {
                    await callback(item, parent)
                }
            }

            for (const value of Object.values(item)) {
                await search(value, item)
            }
        }
    }

    await search(obj, obj);
    return results;
}