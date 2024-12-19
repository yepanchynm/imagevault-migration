import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";

export class ReplaceStoryImagesService {
    #storyData
    result = null

    constructor(storyData) {
        if (!storyData) {
            this.#storyData = {};
        }
        this.#storyData = storyData;
    }

    replace(replacesUrls) {
        return bypassObjectEntries(this.#storyData, 'plugin', 'image-vault', async (item) => {
            item.item?.MediaConversions?.forEach(media => {
                const oldSrc = media.Url;
    
                const fileName = oldSrc.split('/').pop();
                const newSrc = replacesUrls.find(urlMapping => urlMapping[fileName]);
    
                if (newSrc) {
                    const newUrl = newSrc[fileName];
                    media.Url = newUrl;
                    media.Html = media.Html.replace(/src="[^"]*"/, `src="${newUrl}"`);
                }
            });
        });
    }

    get() {
        return this.#storyData
    }
}