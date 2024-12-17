import {storyblokService} from "./storyblokService.js";
import { promises, existsSync, mkdirSync } from 'fs';
import { join } from 'path'

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
        const allStories = await storyblokService.getAllStories()
        await promises.writeFile(getStoryFilename('all'), JSON.stringify(allStories, null, 2));

        const data = await storyblokService.getStoryBySlug('en/main/demos/brights/demo-product')
        if (data.id) {
            const response = await storyblokService.updateStory(
                data.id,
                { ...data, name: 'Test from api v2' },
                {
                    force_update: 1,
                    publish: 1,
                }
            );
            console.log(response);
        }

        await promises.writeFile(getStoryFilename('demo-product'), JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }

    return {}
}

export const {} = bootstrap();