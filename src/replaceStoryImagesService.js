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
            if (!item.item?.MediaConversions?.[0]) {
                console.error(`There is no picture in component ${item.id}`)
                return
            }

            const newData = {...item.item?.MediaConversions?.[0]}

            const fileName = newData.Name;
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[fileName])?.[fileName];

            if (!newAssetData) return

            const newUrl = newAssetData.filename;
            newData.Url = newUrl;
            newData.Html = newData.Html.replace(/src="[^"]*"/, `src="${newUrl}"`);
            newData.StoryblokImage = {
                ...newAssetData
            }

            console.log(`${newData.Name} updated with new image src: ${newAssetData.filename}`)

            return [{
                ...item,
                ...newData,
            }]
        })
        return this;
    }

    get() {
        return this.#result
    }
}