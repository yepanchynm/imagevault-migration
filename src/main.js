import { storyblokService } from "./storyblokService.js";
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ReplaceStoryImagesService } from "./replaceStoryImagesService.js";
import { fileURLToPath } from 'url';
import { restoreStoriesFromFile, restoreComponentsFromFile } from './helpers/restore.js';
import { configService } from "./configService.js";

const getDataFolderPath = () => {
    const __dirname = fileURLToPath(import.meta.url).replace(/\/[^\/]*$/, '');
    const path = join(__dirname, '..', 'data');
    if (!existsSync(path)) {
        mkdirSync(path);
    }
    return path;
};

const getStoryFilename = (name, folder = '') => {
    const basePath = getDataFolderPath();
    const targetPath = folder && ['before', 'after', 'components'].includes(folder) ? join(basePath, folder) : basePath;

    if (!existsSync(targetPath)) {
        mkdirSync(targetPath);
    }

    return join(targetPath, `${name}.stories.json`);
};

const saveToFile = async (filename, data, folder = '') => {
    await fs.writeFile(getStoryFilename(filename, folder), JSON.stringify(data, null, 2));
    console.log(`${filename} file created`);
};


const updateStory = async (storyData) => {
    const storySlug = storyData.full_slug;
    const filenamePrefix=  storySlug.replace(/\//g, '-')
    await saveToFile(filenamePrefix, storyData, 'before');

    const replaceStoryService = new ReplaceStoryImagesService(storyData);
    await replaceStoryService.replace();
    const updatedStoryData = replaceStoryService.get();

    await saveToFile(`${filenamePrefix}`, updatedStoryData, 'after');

    if (storyData.id && storyData.full_slug) {
        const isPublished = await storyblokService.isStoryPublished(storyData.full_slug);
        const response = await storyblokService.updateStory(
            storyData.id,
            updatedStoryData,
            {
                // force_update: 1,
                ...( isPublished ? { publish: 1 } : {} )
            }
        );
        if (response?.status === 200) {
            console.log(`Story ${updatedStoryData.id} updated and ${isPublished ? 'published' : 'saved as draft'} successfully`);
        } else {
            console.log(`Failed to update story ID ${updatedStoryData.id}`);
        }
    }
}

// Main bootstrap function
const bootstrap = async () => {
    try {
        const restore = configService.get('RESTORE') || 'false';

        if (restore === 'true') {
            console.log('Starting restoring...')
            const restoreData = await fs.readFile(getStoryFilename('data-to-update'));
            const stories = JSON.parse(restoreData);
            await restoreStoriesFromFile(stories);
            return
        }

        const dataBeforeUpdate = await storyblokService.getAllStories();
        await saveToFile('data-to-update', dataBeforeUpdate);
        for (const story of dataBeforeUpdate) {
            try {
                 await updateStory(story);
            } catch (error) {
                console.error(`Failed to update story with id ${story?.id}:`, error);
            }
        }
    } catch (err) {
        console.error('Error in bootstrap:', err);
    }
};

export const {} = bootstrap();
