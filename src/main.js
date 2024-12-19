import {storyblokService} from "./storyblokService.js";
import { promises, existsSync, mkdirSync } from 'fs';
import { join } from 'path'
import {ReplaceStoryImagesService} from "./replaceStoryImagesService.js";
import ImageVaultService from './imageVault/imageVaultService.js';
import axios from "axios";

const getDataFolderPath = () => {
    const path = join(import.meta.dirname, '..', 'data');
    if (!existsSync(path)) {
        mkdirSync(path);
    }

    return path
}

const getStoryFilename = (name) => {
    const fileName = `${name}.stories.json`;
    return join(getDataFolderPath(), fileName);
}

async function bootstrap() {
    try {
        const imageVaultService = new ImageVaultService();
        const data = await storyblokService.getStoryBySlug('en/main/demos/brights/demo-vlad')
        const urls = await imageVaultService.getImageVaultUrls(data)

        const replacesUrls = []

        for (const url of urls) {
            const imageResponse = await axios.get(url, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(imageResponse.data, 'binary');
            const fileName = url.split('/').pop();
            const storyblokUrl = await storyblokService.uploadAsset(buffer, fileName)
            replacesUrls.push({[url.split('/').pop()] : storyblokUrl})
        }
        const replaceStoryImageService = new ReplaceStoryImagesService(data)

        await promises.writeFile(getStoryFilename('demo-product'), JSON.stringify(data, null, 2));

        const newData = replaceStoryImageService.replace(replacesUrls).get()
        await promises.writeFile(getStoryFilename('demo-product-replaced'), JSON.stringify(newData, null, 2));

        if (newData.id) {
            const response = await storyblokService.updateStory(newData.id, newData, {
                force_update: 1,
                publish: 1,
            })
            console.log(`${newData.id} updated`)
        }
    } catch (err) {
        console.error(err);
    }

    return {}
}

export const {} = bootstrap();