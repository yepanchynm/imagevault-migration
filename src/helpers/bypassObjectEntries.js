export function bypassObjectEntries(obj, key, value, callback) {
    let results = [];

    function search(item) {
        if (Array.isArray(item)) {
            item.forEach(search);
        } else if (item && typeof item === "object") {
            if (item[key] === value) {
                results.push(item);
                if (typeof callback === "function") {
                    callback(item)
                }
            }
            Object.values(item).forEach(search);
        }
    }

    search(obj);
    return results;
}