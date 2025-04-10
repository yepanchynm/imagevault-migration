import { storyblokService } from "./storyblokService.js";
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ReplaceService } from "./replaceService.js";
import { fileURLToPath } from 'url';
import { restoreStoriesFromFile, restoreComponentsFromFile } from './helpers/restore.js';
import { ChangeComponentSchemaService } from "./changeComponentSchemaService.js"
import { getComponentMapWithMarkdownFields } from "./helpers/getComponentMapWithMarkdownFields.js"
import {ScreenshotService} from "./screenshotService.js";

const COMPONENTS_NAMES_WHITELIST = []
export const EDITORIAL_MARKDOWN_PLUGIN_NAME = 'editorialMarkdown';
export const MARKDOWN_PLUGIN_NAME = 'markdown';

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

const processComponents = async (components) => {
    const componentsWithMarkdown = components.filter(item =>
        Object.values(item.schema).some(key => key.type === MARKDOWN_PLUGIN_NAME || key.type === EDITORIAL_MARKDOWN_PLUGIN_NAME)
    );

    const componentsWithMarkdownNames = componentsWithMarkdown.map(comp => comp.name);

    const componentsWithWhitelistedMarkdown = components.filter(item =>
        Object.values(item.schema).some(field =>
            field?.component_whitelist?.some(w => componentsWithMarkdownNames.includes(w))
        )
    );

    return {
        componentsWithMarkdown,
        componentsWithMarkdownNames,
        componentsWithWhitelistedMarkdown,
    };
};

const updateMarkdownComponents = async (componentsWithMarkdown) => {
    for (const component of componentsWithMarkdown) {
        const componentData = await storyblokService.getComponentById(component.id);
        if (!componentData?.component?.schema) continue;

        const replaceSchemaService = new ChangeComponentSchemaService(componentData.component.schema);
        await replaceSchemaService.replace()
        componentData.component.schema = replaceSchemaService.get();

        await saveToFile(`${component.name}-replaced`, componentData, 'components');

        // const updateResponse = await storyblokService.updateComponentById(component.id, componentData);
        // if (updateResponse.status === 200) {
        //     console.log(`${component.id} (${component.name}) updated successfully`);
        // } else {
        //     console.log(`Failed to update component ID ${component.id} (${component.name})`);
        // }
    }
};

const updatePageComponents = async (components) => {
    for (const component of components) {
        const componentData = await storyblokService.getComponentById(component.id);
        if (!componentData?.component?.schema || !componentData?.component?.is_root) continue;
        componentData.component.schema['SeoTitle'] = {
            type: 'text',
            translatable: true
        };

        componentData.component.schema['SeoDescription'] = {
            type: 'textarea',
            translatable: true
        };

        await saveToFile(`${component.name}-root-replaced`, componentData, 'components');

        // const updateResponse = await storyblokService.updateComponentById(component.id, componentData);
        // if (updateResponse.status === 200) {
        //     console.log(`${component.id} (${component.name}) updated successfully`);
        // } else {
        //     console.log(`Failed to update component ID ${component.id} (${component.name})`);
        // }
    }
};

const updateStory = async (storyData, componentMap) => {
    const storySlug = storyData.full_slug;
    const filenamePrefix=  storySlug.replace(/\//g, '-')
    await saveToFile(filenamePrefix, storyData, 'before');

    const replaceStoryService = new ReplaceService(storyData, componentMap);
    await replaceStoryService.replace();
    const updatedStoryData = replaceStoryService.get();

    await saveToFile(`${filenamePrefix}`, updatedStoryData, 'after');

    // if (storyData.id && storyData.full_slug) {
    //     const isPublished = await storyblokService.isStoryPublished(storyData.full_slug);
    //     if (isPublished) {
    //         const response = await storyblokService.updateStory(
    //             storyData.id,
    //             storyData,
    //             {
    //                 // force_update: 1,
    //                 publish: 1
    //             }
    //         );
    //         if (response?.status === 200) {
    //             console.log(`Story ${storyData.id} updated and publish successfully`);
    //         } else {
    //             console.log(`Failed to update story ID ${storyData.id}`);
    //         }
    //     }
    // }
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
        const components = await storyblokService.getComponentsList();
        if (!components?.components) return;

        await saveToFile('components', components, 'components');

        await updatePageComponents(components.components);

        const {
            componentsWithMarkdown,
            componentsWithMarkdownNames,
            componentsWithWhitelistedMarkdown
        } = await processComponents(components.components);

        await saveToFile('components-with-markdown', componentsWithMarkdown, 'components');
        await saveToFile('components-with-markdown-names', componentsWithMarkdownNames, 'components');
        await saveToFile('components-which-has-whitelisted-markdown', componentsWithWhitelistedMarkdown, 'components');

        const componentsToUpdate = getComponentsToUpdate(componentsWithMarkdown)
        await updateMarkdownComponents(componentsToUpdate);
        await saveToFile('components-to-update', componentsToUpdate);

        const componentMap = getComponentMapWithMarkdownFields(componentsWithMarkdown);
        // const restore = configService.get('RESTORE') || 'false';

        // if (restore === 'true') {
        //     console.log('Starting restoring...')
        //     const restoreData = await fs.readFile(getStoryFilename('data-to-update'));
        //     const stories = JSON.parse(restoreData);
        //     await restoreStoriesFromFile(stories);
            
        //     const restoredComponents = await fs.readFile(getStoryFilename('components-to-update'));
        //     const components = JSON.parse(restoredComponents);
        //     await restoreComponentsFromFile(components);
        //     return
        // }

        const dataBeforeUpdate = await storyblokService.getAllStories();
        await saveToFile('data-to-update', dataBeforeUpdate);

        for (const story of dataBeforeUpdate) {
            const screenshotService = new ScreenshotService(
                story.uuid,
                `https://tobiiweb-dev.azurewebsites.net/${story.full_slug}`
            )
            await screenshotService.take('before')

            await updateStory(story, componentMap);

            await screenshotService.take('after')

            try {
                await screenshotService.compare()
            } catch (err) {
                console.error(err.message);
                console.log('Rolling back migration...');

                // @TODO Add rollback

                process.exit(1);
            }
        }
    } catch (err) {
        console.error('Error in bootstrap:', err);
    }
};

export const {} = bootstrap();
