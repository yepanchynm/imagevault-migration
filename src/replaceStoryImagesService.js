import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";

function removeObjectByValue(obj, key, value) {
    if (Array.isArray(obj)) {
        return obj.filter(item => {
            if (typeof item === "object") {
                return removeObjectByValue(item, key, value);
            }
            return item[key] !== value;
        });
    } else if (typeof obj === "object" && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
            if (k === key && v === value) {
                delete obj[k];
            } else if (typeof v === "object") {
                obj[k] = removeObjectByValue(v, key, value);
            }
        }
    }
    return obj;
}

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
        bypassObjectEntries(this.#storyData, 'plugin', 'image-vault', async (item) => {
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

        return this;
    }

    get() {
        return this.#storyData
    }
}