import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import { markdownToRichtext } from "./helpers/markdownToRichtext.js";

export class ReplaceService {
    #storyData;
    #result = null;
    
    constructor(storyData) {
        this.#storyData = storyData || {};
    }

    async replace() {
        this.#storyData = await bypassObjectEntries(this.#storyData, async (original, modified) => {
            if (original.markdown) {
                modified.richtext = await markdownToRichtext(original.markdown);
                delete modified.markdown;
            }
            if (original.component === "markdown") {
                modified.component = "richtext";
            }
            if (original.component === "editorialMarkdown") {
                modified.component = "editorialRichtext";
            }
        });
        this.#result = this.#storyData;
        return this;
    }

    get() {
        return this.#result;
    }
}