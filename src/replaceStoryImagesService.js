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

            if (!item._uid) {
                console.error(`There is no uid in component ${item.id}`)
                return
            }

            const newData = {...item.item?.MediaConversions?.[0]}
            const oldSrc = newData.Url;

            const fileName = oldSrc.split('/').pop();
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[fileName])?.[fileName];

            if (!newAssetData) return

            const newUrl = newAssetData.filename;
            newData.Url = newUrl;
            newData.Html = newData.Html.replace(/src="[^"]*"/, `src="${newUrl}"`);
            newData.Image = {
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

            return [{
                _uid: item._uid,
                title: "New Block Title",
                component: 'imageComponent',
                description: "This is a new block added via API",
                ...newData,
            }]
        })
        return this;
    }

    get() {
        return this.#result
    }
}