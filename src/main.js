import { storyblokService } from "./storyblokService.js";
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ReplaceStoryImagesService } from "./replaceStoryImagesService.js";
import ImageVaultService from './imageVault/imageVaultService.js';
import { fileURLToPath } from 'url';
import axios from "axios";
import { ChangeComponentSchemaService } from "./changeComponentSchemaService.js";
import { restoreStoriesFromFile, restoreComponentsFromFile } from './helpers/restore.js';
import {configService} from "./configService.js";

// const WORKING_STORY_SLUGS = [
//     'en/investor/demos/brights/migration-test-page',
//     // 'zh/main/demos/brights/migration-test-page',
//     // 'ja/main/demos/brights/migration-test-page',
//     // 'sv/investor/demos/brights/migration-test-page',
//     // 'en/main/demos/brights/migration-test-page'
// ];

const COMPONENTS_NAMES_WHITELIST = []
export const IMAGEVAULT_PLUGIN_NAME = 'image-vault';

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

const getReplacesUrlsFilename = () => join(getDataFolderPath(), 'replacesUrls.json');

const saveToFile = async (filename, data, folder = '') => {
    await fs.writeFile(getStoryFilename(filename, folder), JSON.stringify(data, null, 2));
    console.log(`${filename} file created`);
};

const processImageVaultUrls = async (toReplace, imageVaultService) => {
    let replacesUrls = [];
    const replacesUrlsFile = getReplacesUrlsFilename();

    if (!existsSync(replacesUrlsFile)) {
        await fs.writeFile(replacesUrlsFile, JSON.stringify([]));
    } else {
        const urls = await fs.readFile(replacesUrlsFile, 'utf-8');
        replacesUrls = JSON.parse(urls);
    }

    for (const replace of toReplace) {
        const id = Object.keys(replace)[0];
        const url = replace[id]; 
        try {
            const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageResponse.data, 'binary');
            const fileName = url.split('/').pop();

            if (replacesUrls.some(item => id in item)) { continue }

            const storyblokData = await storyblokService.uploadAsset(buffer, fileName);
            replacesUrls.push({ [id]: storyblokData });

            console.log('[UPLOAD ASSET]', storyblokData)

            const imageVaultImageData = await imageVaultService.searchImageData(id);

            const categories = imageVaultImageData?.categories?.length > 0 
                ? imageVaultImageData.categories
                : [{ name: 'No category' }]

            let storyblokTags = await storyblokService.getTags();
            const assetTags = [];
            
            const altText = imageVaultImageData.metadata.find(item => item.definitionId === 1082);

            console.log('[DATA FOR UPDATE COLLECTED]')

            for (const category of categories) {
                let tag = storyblokTags?.find(tag => tag.name.toLowerCase() === category.name.toLowerCase());
                if (!tag) {
                    await storyblokService.createTag(category.name);
                    storyblokTags = await storyblokService.getTags();
                    tag = storyblokTags?.find(tag => tag.name.toLowerCase() === category.name.toLowerCase());
                }
                if (tag?.id) assetTags.push(tag.id);
            }

            console.log('[DATA FOR UPDATE', storyblokData.id, { asset: { 
                internal_tag_ids: assetTags,
                title: altText?.value,
                alt: altText?.value
            } })

            await storyblokService.updateAsset(storyblokData.id, { asset: { 
                internal_tag_ids: assetTags,
                title: altText?.value,
                alt: altText?.value
            } });
            console.log('[ASSET UPDATED]')

        } catch (error) {
            console.error(`Failed to process URL ${url}:`, error.message);
            const fallback = {
                "id": 20093191,
                "filename": "https://a.storyblok.com/f/318103/bb2b33caed/tobii-pontus-walck.jpg",
                "meta_data": {}
            };
            replacesUrls.push({ 20093191: fallback });
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
        await replaceSchemaService.replace()
        componentData.component.schema = replaceSchemaService.get();

        await saveToFile(`${component.name}-replaced`, componentData, 'components');

        const updateResponse = await storyblokService.updateComponentById(component.id, componentData);
        if (updateResponse.status === 200) {
            console.log(`${component.id} (${component.name}) updated successfully`);
        } else {
            console.log(`Failed to update component ID ${component.id} (${component.name})`);
        }
    }
};

const updateStory = async (storyData) => {
    const imageVaultService = new ImageVaultService();
    const storySlug = storyData.full_slug;
    // const storyData = await storyblokService.getStoryBySlug(storySlug);
    const filenamePrefix=  storySlug.replace(/\//g, '-')
    await saveToFile(filenamePrefix, storyData, 'republish');

    const toReplace = await imageVaultService.getImageVaultUrls(storyData);
    const replacesUrls = await processImageVaultUrls(toReplace, imageVaultService);

    const replaceStoryService = new ReplaceStoryImagesService(storyData);
    await replaceStoryService.replace(replacesUrls);
    const updatedStoryData = replaceStoryService.get();

    await saveToFile(`${filenamePrefix}`, updatedStoryData, 'after');

    if (storyData.id && storyData.full_slug) {
        const isPublished = await storyblokService.isStoryPublished(storyData.full_slug);
        if (isPublished) {
            const response = await storyblokService.updateStory(
                storyData.id,
                storyData,
                {
                    // force_update: 1,
                    publish: 1
                }
            );
            if (response?.status === 200) {
                console.log(`Story ${storyData.id} updated and publish successfully`);
            } else {
                console.log(`Failed to update story ID ${storyData.id}`);
            }
        }
    }
}

const getComponentsToUpdate = (components) => {
    if (!COMPONENTS_NAMES_WHITELIST?.length) return components
    return components.filter((component) => {
        return COMPONENTS_NAMES_WHITELIST.includes(component.name)
    })
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
            
            const restoredComponents = await fs.readFile(getStoryFilename('components-to-update'));
            const components = JSON.parse(restoredComponents);
            await restoreComponentsFromFile(components);
            return
        }

        const dataBeforeUpdate = await storyblokService.getAllStories();
        await saveToFile('data-to-update', dataBeforeUpdate);

        for (const story of dataBeforeUpdate) {
            await updateStory(story);
        }

        const components = await storyblokService.getComponentsList();
        if (!components?.components) return;

        await saveToFile('components', components, 'components');

        const {
            componentsWithImageVault,
            componentsWithImageVaultNames,
            componentsWithWhitelistedImageVault
        } = await processComponents(components.components);

        await saveToFile('components-with-imagevault', componentsWithImageVault, 'components');
        await saveToFile('components-with-imagevault-names', componentsWithImageVaultNames, 'components');
        await saveToFile('components-which-has-whitelisted-ImageVault', componentsWithWhitelistedImageVault, 'components');

        const componentsToUpdate = getComponentsToUpdate(componentsWithImageVault)
        await updateImageVaultComponents(componentsToUpdate);
        await saveToFile('components-to-update', componentsToUpdate);
    } catch (err) {
        console.error('Error in bootstrap:', err);
    }
};

export const {} = bootstrap();
