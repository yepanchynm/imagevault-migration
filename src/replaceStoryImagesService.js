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

            let newData = {}

            const id = item?.item?.Id;
            const newAssetData = replacesUrls.find(urlMapping => urlMapping[id])?.[id];

            if (!newAssetData) {
                console.error(`There is no ${id} in replacesUrls`)
                return item
            }

            const assetUrl = newAssetData?.filename;
            const imageVaultUrl = item?.item?.MediaConversions?.[0].Url;
            const alt = item?.item?.Metadata?.find(meta => meta.MetadataDefinitionId === 1082)?.Value

            const modifiedAssetData = {
                ...newAssetData,
                alt,
                name: "",
                focus: "",
                title: alt,
                source: "",
                copyright: "",
                fieldtype: "asset",
                is_external_url: false,
            };

            modifiedAssetData.meta_data = !!modifiedAssetData?.meta_data ? {...modifiedAssetData.meta_data, item: item?.item} : { item: item?.item }

            try {
                let res;
                try {
                    res = await axios.post('http://127.0.0.1:8000/check-crop/', {
                        original_url: assetUrl,
                        cropped_url: imageVaultUrl
                    });
                } catch (error) {
                    throw  new Error('Error while get crop image size.');
                }

                if (res.data && !isNaN(res.data.x1) && !isNaN(res.data.x2) && !isNaN(res.data.y1) && !isNaN(res.data.y2)) {
                    const { x1, y1, x2, y2 } = res.data;

                    // Check max and min values & clamp by 0
                    const newX1 = Math.max(Math.min(x1, x2), 0)
                    const newX2 = Math.max(Math.max(x1, x2), 0)
                    const newY1 = Math.max(Math.min(y1, y2), 0)
                    const newY2 = Math.max(Math.max(y1, y2), 0)

                    console.log(`/m/${newX1}x${newY1}:${newX2}x${newY2}`)

                    // modifiedAssetData.filename += `/m/${newX1}x${newY1}:${newX2}x${newY2}`
                    modifiedAssetData.meta_data.crop = {
                        x1: newX1,
                        x2: newX2,
                        y1: newY1,
                        y2: newY2,
                    }
                    newData = {...newData, ...modifiedAssetData}
                } else {
                    throw new Error('Empty body or not all needed data')
                }
            
                console.log(`[ID ${id}] ${item?.item?.MediaConversions?.[0].Url} replaced with: ${newData.filename}`);
                return {
                    ...newData
                };            
            } catch (e) {
                console.error('Cant apply style for file ' + assetUrl);
                console.error(e.message);

                // modifiedAssetData.filename += '/m/0x0:0x0';
                modifiedAssetData.meta_data.crop = {
                    x1: 0,
                    x2: 0,
                    y1: 0,
                    y2: 0,
                }
                newData = {...newData, ...modifiedAssetData}

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