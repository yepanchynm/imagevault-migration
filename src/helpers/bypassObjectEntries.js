export async function bypassObjectEntries(obj) {
    if (Array.isArray(obj)) {
        return await Promise.all(obj.map(item => bypassObjectEntries(item)));
    }

    if (typeof obj === 'object' && obj !== null) {
        const newObj = { ...obj };

        if (
            newObj.meta_data &&
            newObj.filename &&
            newObj.item &&
            newObj.item.MediaConversions &&
            newObj.item.Metadata
        ) {
            delete newObj.item;
        }

        for (const key of Object.keys(newObj)) {
            newObj[key] = await bypassObjectEntries(newObj[key]);
        }

        return newObj;
    }

    return obj;
}