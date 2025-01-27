import { storyblokService } from "./storyblokService.js";
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ReplaceStoryImagesService } from "./replaceStoryImagesService.js";
import ImageVaultService from './imageVault/imageVaultService.js';
import { fileURLToPath } from 'url';
import axios from "axios";
import { ChangeComponentSchemaService } from "./changeComponentSchemaService.js";
import { restoreStoriesFromFile } from './helpers/restore.js'

const WORKING_STORY_SLUG = 'home';
export const IMAGEVAULT_PLUGIN_NAME = 'image-vault-new';
export const NEW_PLUGIN_NAME = 'image-plugin';

const getDataFolderPath = () => {
    const __dirname = fileURLToPath(import.meta.url).replace(/\/[^\/]*$/, '');
    const path = join(__dirname, '..', 'data');
    if (!existsSync(path)) {
        mkdirSync(path);
    }
    return path;
};

const getStoryFilename = (name) => join(getDataFolderPath(), `${name}.stories.json`);

const getReplacesUrlsFilename = () => join(getDataFolderPath(), 'replacesUrls.json');

const saveToFile = async (filename, data) => {
    await fs.writeFile(getStoryFilename(filename), JSON.stringify(data, null, 2));
    console.log(`${filename} file created`);
};

const processImageVaultUrls = async (urls, imageVaultService) => {
    let replacesUrls = [];
    const replacesUrlsFile = getReplacesUrlsFilename();

    if (!existsSync(replacesUrlsFile)) {
        await fs.writeFile(replacesUrlsFile, JSON.stringify([]));
    } else {
        const urls = await fs.readFile(replacesUrlsFile, 'utf-8');
        replacesUrls = JSON.parse(urls);
    }

    for (const url of urls) {
        try {
            const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageResponse.data, 'binary');
            const fileName = url.split('/').pop();

            if (replacesUrls.some(item => fileName in item)) { continue }

            const storyblokData = await storyblokService.uploadAsset(buffer, fileName);
            replacesUrls.push({ [fileName]: storyblokData });

            console.log('[UPLOAD ASSET]', storyblokData)

            const imageVaultImageData = await imageVaultService.searchImageData(fileName);

            if (imageVaultImageData?.categories?.length > 0) {
                let storyblokTags = await storyblokService.getTags();
                const assetTags = [];

                for (const category of imageVaultImageData.categories) {
                    let tag = storyblokTags?.find(tag => tag.name.toLowerCase() === category.name.toLowerCase());

                    if (!tag) {
                        const createdTag = await storyblokService.createTag(category.name);
                        storyblokTags = await storyblokService.getTags();
                        tag = createdTag.internal_tag;
                    }

                    if (tag?.id)
                        assetTags.push(tag.id);
                }

                const data = await storyblokService.updateAsset(storyblokData.id, { asset: { internal_tag_ids: assetTags } });
                console.log('[UPDATE ASSET]', data)
            }
        } catch (error) {
            console.error(`Failed to process URL ${url}:`, error.message);
            const fallback = {
                "id": 20093191,
                "filename": "https://a.storyblok.com/f/318103/bb2b33caed/tobii-pontus-walck.jpg",
                "meta_data": {}
            };
            replacesUrls.push({ [url.split('/').pop()]: fallback });
        }
    }

    await fs.writeFile(replacesUrlsFile, JSON.stringify(replacesUrls));
    return replacesUrls;
};

const processComponents = async (components) => {
    const componentsWithImageVault = components.filter(item =>
        Object.values(item.schema).some(field => field?.field_type === IMAGEVAULT_PLUGIN_NAME)
    );

    const componentsWithImageVaultNames = componentsWithImageVault.map(comp => comp.name);

    const componentsWithWhitelistedImageVault = components.filter(item =>
        Object.values(item.schema).some(field =>
            field?.component_whitelist?.some(w => componentsWithImageVaultNames.includes(w))
        )
    );

    return {
        componentsWithImageVault,
        componentsWithImageVaultNames,
        componentsWithWhitelistedImageVault,
    };
};

const updateImageVaultComponents = async (componentsWithImageVault) => {
    for (const component of componentsWithImageVault) {
        const componentData = await storyblokService.getComponentById(component.id);
        if (!componentData?.component?.schema) continue;

        const replaceSchemaService = new ChangeComponentSchemaService(componentData.component.schema);
        componentData.component.schema = replaceSchemaService.replace().get();

        await saveToFile(`${component.name}-replaced`, componentData);

        const updateResponse = await storyblokService.updateComponentById(component.id, componentData);
        if (updateResponse.status === 200) {
            console.log(`${component.id} (${component.name}) updated successfully`);
        } else {
            console.log(`Failed to update component ID ${component.id} (${component.name})`);
        }
    }
};

// Main bootstrap function
const bootstrap = async () => {
    try {
        const imageVaultService = new ImageVaultService();

        const restore = false;

        if (restore === true) {
            const restoreData = fs.readFile(getStoryFilename('data-before-update'));
            const stories = JSON.parse(restoreData);
            await restoreStoriesFromFile(stories);
            return
        } else {
            const dataBeforeUpdate = await storyblokService.getAllStories();
            await saveToFile('data-before-update', dataBeforeUpdate);
        }

        const storyData = await storyblokService.getStoryBySlug(WORKING_STORY_SLUG);
        await saveToFile(WORKING_STORY_SLUG, storyData);

        const imageVaultUrls = await imageVaultService.getImageVaultUrls(storyData);
        const replacesUrls = await processImageVaultUrls(imageVaultUrls, imageVaultService);

        const components = await storyblokService.getComponentsList();
        if (!components?.components) return;

        await saveToFile('components', components);

        const {
            componentsWithImageVault,
            componentsWithImageVaultNames,
            componentsWithWhitelistedImageVault
        } = await processComponents(components.components);

        await saveToFile('components-with-imagevault', componentsWithImageVault);
        await saveToFile('components-with-imagevault-names', componentsWithImageVaultNames);
        await saveToFile('components-which-has-whitelisted-ImageVault', componentsWithWhitelistedImageVault);

        await updateImageVaultComponents(componentsWithImageVault);

        const replaceStoryService = new ReplaceStoryImagesService(storyData);
        const updatedStoryData = replaceStoryService.replace(replacesUrls).get();

        await saveToFile(`${WORKING_STORY_SLUG}-replaced`, updatedStoryData);

        if (updatedStoryData.id) {
            const response = await storyblokService.updateStory(updatedStoryData.id, updatedStoryData, {
                force_update: 1,
                publish: 1,
            });

            if (response.status === 200) {
                console.log(`Story ${updatedStoryData.id} updated successfully`);
            } else {
                console.log(`Failed to update story ID ${updatedStoryData.id}`);
            }
        }
    } catch (err) {
        console.error('Error in bootstrap:', err);
    }
};

export const {} = bootstrap();
