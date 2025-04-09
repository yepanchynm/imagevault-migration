export function getComponentMapWithMarkdownFields(components) {
    const result = {};

    for (const comp of components) {
        const markdownFields = Object.entries(comp.schema || {})
            .filter(([_, field]) => field.type === 'markdown')
            .map(([key]) => key);

        if (markdownFields.length > 0) {
            result[comp.name] = markdownFields;
        }
    }

    return result;
}