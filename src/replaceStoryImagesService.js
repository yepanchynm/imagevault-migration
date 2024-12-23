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

            const newData = {...item.item}
            const oldSrc = newData?.MediaConversions?.[0].Url;

            const fileName = oldSrc.split('/').pop();
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[fileName])?.[fileName];

            if (!newAssetData) return

            newData.StoryblokImage = {
                "id": newAssetData.id,
                "alt": "",
                "name": "",
                "focus": "",
                "title": "",
                "source": "",
                "filename": newAssetData.filename,
                "copyright": "",
                "fieldtype": "asset",
                "meta_data": newAssetData.meta_data,
                "is_external_url": false
            }

            console.log(`${item._uid} updated with new image src: ${newData.Url}`)

            return {
                ...item,
                item: newData
            }
        })
        return this;
    }

    get() {
        return this.#result
    }
}