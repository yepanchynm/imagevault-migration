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

    replace() {
        bypassObjectEntries(this.#storyData,
            'plugin',
            'image-vault',
            async (item, parent) => {
                const [mediaConversation] = item.item?.MediaConversions;
                const {_uid} = item

                if (!mediaConversation) {
                    console.error('No image')
                    return;
                }

                removeObjectByValue(parent, '_uid', _uid)

                console.log(_uid, parent._uid)
            }
        )

        return this
    }

    get() {
        return this.#storyData
    }
}