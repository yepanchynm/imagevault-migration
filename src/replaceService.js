import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import { markdownToRichtext } from "./helpers/markdownToRichtext.js";

export class ReplaceService {
    #storyData;
    #componentMap;
    #result = null;

    constructor(storyData, componentMap) {
        this.#storyData = storyData || {};
        this.#componentMap = componentMap || {}; // key: component name, value: array of markdown fields
    }

    async replace() {
        this.#storyData = await bypassObjectEntries(this.#storyData, async (original, modified) => {
            const component = original.component;
            const markdownFields = this.#componentMap[component];

            if (Array.isArray(markdownFields)) {
                for (const field of markdownFields) {
                    if (original[field]) {
                        const richText = await markdownToRichtext(original[field]);
                        modified[`${field}_richtext`] = richText;
                    }
                }
            }
        });

        this.#result = this.#storyData;
        return this;
    }

    get() {
        return this.#result;
    }
}
