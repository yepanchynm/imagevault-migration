import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import StoryblokMarkdownToRichtext from 'storyblok-markdown-richtext'
import {COMPONENTS_NAMES_WHITELIST} from "./main.js";

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

            if (COMPONENTS_NAMES_WHITELIST.length > 0 && !COMPONENTS_NAMES_WHITELIST.includes(component)) {
                return
            }

            if (Array.isArray(markdownFields)) {
                for (const field of markdownFields) {
                    if (original[field] && typeof original[field] === 'string') {
                        const richText = StoryblokMarkdownToRichtext.markdownToRichtext(original[field]);
                        modified[field] = richText;
                    }
                }
            }

            if (original.seoMeta) {
                const { title, description } = original.seoMeta;                
        
                modified['seoTitle'] = title || "";
                modified['seoDescription'] = description || "";
            }
        });

        this.#result = this.#storyData;
        return this;
    }

    get() {
        return this.#result;
    }
}
