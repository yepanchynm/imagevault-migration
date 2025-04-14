import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
// import { markdownToStoryblokRichtext } from "./helpers/markdownToRichtext.js";
import StoryblokMarkdownToRichtext from 'storyblok-markdown-richtext'

const {markdownToRichtext} = StoryblokMarkdownToRichtext

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
                        const richText = StoryblokMarkdownToRichtext.markdownToRichtext(original[field]);
                        modified[field] = richText;
                    }
                }
            }

            if (original.seoMeta) {
                const { title, description } = original.seoMeta;                
        
                if (title) modified['SeoTitle'] = title;
                if (description) modified['SeoDescription'] = description;
            }
        });

        this.#result = this.#storyData;
        return this;
    }

    get() {
        return this.#result;
    }
}
