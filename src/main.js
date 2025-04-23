import { storyblokService } from "./storyblokService.js";
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ReplaceService } from "./replaceService.js";
import { fileURLToPath } from 'url';
import { restoreStoriesFromFile, restoreComponentsFromFile } from './helpers/restore.js';
import { ChangeComponentSchemaService } from "./changeComponentSchemaService.js"
import { getComponentMapWithMarkdownFields } from "./helpers/getComponentMapWithMarkdownFields.js"
import { ScreenshotService } from "./screenshotService.js";
import {configService} from "./configService.js";
import {sleep} from "./storyblokClient.js";

export const COMPONENTS_NAMES_WHITELIST = [
    // 'RichTextMarkdown',
    // 'productPage',
    // 'testComponentBlock'
]
const STORIES_TO_UPDATE = [
    // 'en/test',
    // 'en/main/demos/brights/rich-text-conversion-test-page'
    // 'en/main/demos/brights/rich-text-conversion-test-page',

    // 'en/main/demos/brights/markdown-richtext/a-practical-introduction-to-eye-tracking',
    // 'en/main/demos/brights/markdown-richtext/blinks-a-hidden-gem-in-eye-tracking-research',
    // 'en/main/demos/brights/markdown-richtext/enhancing-aviation-safety-and-design-with-eye-tracking',
    // 'en/main/demos/brights/markdown-richtext/improving-thoracoscopic-surgery-training-with-eye-tracking',
    // 'en/main/demos/brights/markdown-richtext/page-with-accordion-blok',
    // 'en/main/demos/brights/markdown-richtext/page-with-columngrid',
    // 'en/main/demos/brights/markdown-richtext/page-with-columngridimageitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-columngridtextitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-columngridtextonly',
    // 'en/main/demos/brights/markdown-richtext/page-with-columngridvideoitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-contentgrid',
    // 'en/main/demos/brights/markdown-richtext/page-with-contentgridslider',
    // 'en/main/demos/brights/markdown-richtext/page-with-ctaform',
    // 'en/main/demos/brights/markdown-richtext/page-with-downloads',
    // 'en/main/demos/brights/markdown-richtext/page-with-downloadsexpandableitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-editorialmarkdown',
    // 'en/main/demos/brights/markdown-richtext/page-with-embed',
    // 'en/main/demos/brights/markdown-richtext/page-with-gateddownloadsexpandableitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-gatedform',
    // 'en/main/demos/brights/markdown-richtext/page-with-herosmall',
    // 'en/main/demos/brights/markdown-richtext/page-with-imagecarousel',
    // 'en/main/demos/brights/markdown-richtext/page-with-markdown',
    // 'en/main/demos/brights/markdown-richtext/page-with-overlayblock',
    // 'en/main/demos/brights/markdown-richtext/page-with-shortfeatures',
    // 'en/main/demos/brights/markdown-richtext/page-with-techspec',
    // 'en/main/demos/brights/markdown-richtext/page-with-techspecfootnote',
    // 'en/main/demos/brights/markdown-richtext/page-with-techspecitem',
    // 'en/main/demos/brights/markdown-richtext/page-with-textandimage',
    // 'en/main/demos/brights/markdown-richtext/page-with-textandimageparallax',
    'en/main/demos/brights/markdown-richtext/page-with-textandvideo',
    'en/main/demos/brights/markdown-richtext/page-with-videocarousel',
    // 'en/main/demos/brights/markdown-richtext/studying-the-beauty-of-hair-with-eye-tracking',
    // 'en/main/demos/brights/markdown-richtext/the-future-of-eye-tracking-in-workforce-development',
    // 'en/main/demos/brights/markdown-richtext/transforming-autism-social-skills-training-with-eye-tracking',
    // 'en/main/demos/brights/markdown-richtext/transforming-autism-social-skills-training-with-eye-tracking-ja',
    // 'en/main/demos/brights/markdown-richtext/transportation-services',
    // 'en/main/demos/brights/markdown-richtext/rights-issue-2024'
]
export const EDITORIAL_MARKDOWN_PLUGIN_NAME = 'editorialMarkdown';
export const MARKDOWN_PLUGIN_NAME = 'markdown';

const WARM_UP_COMPARING_COUNT = 15;
const TIMEOUT_BETWEEN_WARM_UP_COMPARING = 10000
const TIMEOUT_BETWEEN_UPDATE_ENDS_AND_COMPARING = 60000

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
        if (COMPONENTS_NAMES_WHITELIST?.length > 0 && !COMPONENTS_NAMES_WHITELIST.includes(component.name)) continue;
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

    if (storyData.id && storyData.full_slug) {
        const isPublished = await storyblokService.isStoryPublished(storyData.full_slug);
        const response = await storyblokService.updateStory(
            storyData.id,
            updatedStoryData,
            isPublished ? {  force_update: 1, publish: 1 } : { force_update: 1 }
        );
        if (response?.status === 200) {
            if (isPublished) {
                console.log(`Story ${storyData.id} updated and publish successfully`);
            } else {
                console.log(`Story ${storyData.id} updated and NOT publish successfully`);
            }

        } else {
            console.log(`Failed to update story ID ${storyData.id}`);
        }
    }
}

const getComponentsToUpdate = (components) => {
    if (!COMPONENTS_NAMES_WHITELIST?.length) return components
    return components.filter((component) => {
        return COMPONENTS_NAMES_WHITELIST.includes(component.name)
    })
}

async function rollbackStory(story) {
    console.log('Rolling back migration...');

    const isPublished = await storyblokService.isStoryPublished(story.full_slug);
    const response = await storyblokService.updateStory(
        story.id,
        story,
        {
            force_update: 1,
            ...( isPublished ? { publish: 1 } : {} )
        }
    );
    if (response?.status === 200) {
        if ( isPublished ) {
            console.log(`Story ${story.id} updated and publish successfully`);
        } else {
            console.log(`Story ${story.id} updated but NOT published successfully`);
        }
    } else {
        console.log(`Failed to update story ID ${story.id}`);
    }
    process.exit(1);
}

const compareWithFirstScreenshot = async (screenshotInstance, story) => {
    if (
        !screenshotInstance ||
        typeof screenshotInstance.take !== 'function' ||
        typeof screenshotInstance.compare !== 'function'
    ) {
        throw new TypeError('The screenshotInstance should be a function');
    }

    await screenshotInstance.take('after')

    try {
        await screenshotInstance.compare()
    } catch (err) {
        console.error(err.message);
        await rollbackStory(story);
    }
}

// Main bootstrap function
const bootstrap = async () => {
    try {
        const components = await storyblokService.getComponentsList();
        if (!components?.components) return;

        await saveToFile('components', components, 'components');

        // await updatePageComponents(components.components);

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

        let dataBeforeUpdate = []

        if (STORIES_TO_UPDATE?.length) {
            dataBeforeUpdate = await Promise.all(STORIES_TO_UPDATE.map(slug => storyblokService.getStoryBySlug(slug)))
        } else {
            dataBeforeUpdate = await storyblokService.getAllStories();
        }

        await saveToFile('data-to-update', dataBeforeUpdate);

        const toCompareCollection = []
        for (const [index, story] of dataBeforeUpdate?.entries()) {
            if (story.full_slug.startsWith('es/') || story.full_slug.startsWith('de/') || story.full_slug.startsWith('fr/'))
            {
                continue
            }
            const screenshotService = new ScreenshotService(
                story.uuid,
                `${configService.get('PREVIEW_URL') || 'https://tobiiweb-preview.azurewebsites.net/'}/${story.full_slug}`
            )

            await screenshotService.take('before');
            await updateStory(story, componentMap);

            console.log(`[INFO] #${index + 1} (${story.full_slug}):`);

            if (index < WARM_UP_COMPARING_COUNT) {
                await sleep(TIMEOUT_BETWEEN_WARM_UP_COMPARING);
                await compareWithFirstScreenshot(screenshotService, story);
            } else {
                toCompareCollection.push(() => compareWithFirstScreenshot(screenshotService, story));
            }
        }

        if (toCompareCollection.length > 0) {
            console.log('=== COMPARE ===')
            await sleep(TIMEOUT_BETWEEN_UPDATE_ENDS_AND_COMPARING);

            for (const callback of toCompareCollection) {
                if (typeof callback === 'function') {
                    await callback()
                }
            }
        }
    } catch (err) {
        console.error('Error in bootstrap:', err);
    }
};

export const {} = bootstrap();
