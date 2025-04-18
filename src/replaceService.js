import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
// import { markdownToStoryblokRichtext } from "./helpers/markdownToRichtext.js";
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
                        richText.content.push({
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "StimTracker provides a reliable and accurate solution to time stamp the onset of screen-based visual stimuli (images shown in Tobii Pro Lab and eye tracking data from Tobii Pro Spectrum) down to a timing accuracy of less than a millisecond. This exceptional timing accuracy benefits studies that require a high temporal resolution, such as reaction time tests and subliminal single-frame stimuli tests."
                                }
                            ]
                        })
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
