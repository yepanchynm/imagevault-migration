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
        bypassObjectEntries(this.#storyData,
            'plugin',
            'image-vault',
            async (item) => {
                item.item?.MediaConversions?.forEach(media => {
                    const newSrc = `https://a.storyblok.com/f/149538/2000x1125/53779230e2/tobii-eye-glasses.jpg`
                    media.Url = newSrc
                    media.Html = media.Html.replace(/src="[^"]*"/, `src="${newSrc}"`)
                })
            }
        )

        return this
    }

    get() {
        return this.#storyData
    }
}