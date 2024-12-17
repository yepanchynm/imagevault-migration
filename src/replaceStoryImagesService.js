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

    replace() {
        return bypassObjectEntries(this.#storyData,
            'plugin',
            'image-vault',
            async (item) => {
                item.item?.MediaConversions?.forEach(media => {
                    const newSrc = 'some_url'
                    media.Url = newSrc
                    media.Html = media.Html.replace(/src="[^"]*"/, `src="${newSrc}"`)
                })
            }
        )
    }
}