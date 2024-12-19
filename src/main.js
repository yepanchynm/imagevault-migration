import {storyblokService} from "./storyblokService.js";
import { promises, existsSync, mkdirSync } from 'fs';
import { join } from 'path'
import {ReplaceStoryImagesService} from "./replaceStoryImagesService.js";

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
        const data = await storyblokService.getStoryBySlug('en/main/demos/brights/demo-product')

        const replaceStoryImageService = new ReplaceStoryImagesService(data)
        await promises.writeFile(getStoryFilename('demo-product'), JSON.stringify(data, null, 2));

        const newData = replaceStoryImageService.replace().get()
        await promises.writeFile(getStoryFilename('demo-product-replaced'), JSON.stringify(newData, null, 2));

        // if (newData.id) {
        //     const response = await storyblokService.updateStory(newData.id, newData, {
        //         force_update: 1,
        //         publish: 1,
        //     })
        //
        //     if (response.status === 200) {
        //         console.log(`${newData.id} updated`)
        //     } else {
        //         console.log(`Failed to update story ID ${newData.id}`)
        //     }
        // }
    } catch (err) {
        console.error(err);
    }

    return {}
}

export const {} = bootstrap();