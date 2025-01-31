import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import axios from "axios";

export class ReplaceStoryImagesService {
    #storyData
    #result = null

    constructor(storyData) {
        if (!storyData) {
            this.#storyData = {};
        }
        this.#storyData = storyData;
    }

    async replace(replacesUrls) {
        this.#result = await bypassObjectEntries(this.#storyData, 'plugin', 'image-vault', async (item) => {
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

            const assetUrl = newAssetData.filename;
            const imageVaultUrl = newData.item?.MediaConversions?.[0].Url;

            const modifiedAssetData = { ...newAssetData };

            try {
                const res = await axios.post('http://127.0.0.1:8000/check-crop/', {
                    original_url: assetUrl,
                    cropped_url: imageVaultUrl
                });
            
                if (res.data && res.data.x1 && res.data.x2 && res.data.y1 && res.data.y2) {
                    const { x1, y1, x2, y2 } = res.data;
                    modifiedAssetData.filename += `/m/${x1}x${y1}:${x2}x${y2}`
                    newData.item.StoryblokImage = modifiedAssetData;
                } else {
                    throw new Error('Empty body or not all needed data')
                }
            
                console.log(`[ID ${id}] ${newData.item?.MediaConversions?.[0].Url} replaced with: ${newData.item.StoryblokImage.filename}`);
                return {
                    ...newData
                };            
            } catch (e) {
                console.error('Cant apply style for file ' + assetUrl);
                console.error(e.message);

                modifiedAssetData.filename += '/m/0x0:0x0';

                newData.item.StoryblokImage = modifiedAssetData;
                return {
                    ...newData
                };
            }
        });
        return this;
    }

    get() {
        return this.#result;
    }
}