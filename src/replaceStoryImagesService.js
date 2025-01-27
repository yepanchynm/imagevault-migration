import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";

export class ReplaceStoryImagesService {
    #storyData
    #result = null

    constructor(storyData) {
        if (!storyData) {
            this.#storyData = {};
        }
        this.#storyData = storyData;
    }

    replace(replacesUrls) {
        this.#result = bypassObjectEntries(this.#storyData, 'plugin', 'image-vault', (item) => {
            if (!item.item) {
                console.error(`There is no picture`)
                return
            }

            const newData = {...item}

            const fileName = newData.item?.MediaConversions?.[0]?.Url.split('/').pop();
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[fileName])?.[fileName];

            if (!newAssetData) {
                console.error(`There is no ${fileName} in replacesUrls`)
                return
            }

            newData.item.StoryblokImage = {
                ...newAssetData
            }

            console.log(`${fileName} updated with new image src: ${newAssetData.filename}`)

            return {
                ...newData
            }
        })
        return this;
    }

    get() {
        return this.#result
    }
}