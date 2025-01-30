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
            if (!item.item?.Id) {
                console.error(`There is no picture`)
                return item
            }

            const newData = {...item, plugin: 'image-plugin'}
            const id = newData?.item?.Id;
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[id])?.[id];

            if (!newAssetData) {
                console.error(`There is no ${id} in replacesUrls`)
                return item
            }

            newData.item.StoryblokImage = {
                ...newAssetData
            }

            console.log(`[ID ${id}] ${newData.item?.MediaConversions?.[0].Url} replaced with: ${newAssetData.filename}`)

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