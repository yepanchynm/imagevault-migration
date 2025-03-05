import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";

export class ReplaceStoryImagesService {
    #storyData;
    #result = null;

    constructor(storyData) {
        this.#storyData = storyData || {};
    }

    async replace() {
        this.#result = await bypassObjectEntries(this.#storyData);
        return this;
    }

    get() {
        return this.#result;
    }
}