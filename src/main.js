import {storyblokService} from "./storyblokService.js";
import { promises, existsSync, mkdirSync } from 'fs';
import { join } from 'path'
import {ReplaceStoryImagesService} from "./replaceStoryImagesService.js";
import ImageVaultService from './imageVault/imageVaultService.js';
import { fileURLToPath } from 'url';
import axios from "axios";
import {ChangeComponentSchemaService} from "./changeComponentSchemaService.js";

const getDataFolderPath = () => {
    const __dirname = fileURLToPath(import.meta.url).replace(/\/[^\/]*$/, '');
    const path = join(__dirname, '..', 'data');
    if (!existsSync(path)) {
        mkdirSync(path);
    }

    return path;
}

const getStoryFilename = (name) => {
    const fileName = `${name}.stories.json`;
    return join(getDataFolderPath(), fileName);
}

// TODO 

// Improve filtering imageVault urls (To not lose unique image)
// Imrpove matching urls
// Transfer images to correct folder (now uploads to all assets)

const WORKING_STORY_SLUG = 'en/main/demos/brights/demo-product-maksym'
const WORKING_COMPONENT_NAME = 'imagevaultMigration_copy'

async function bootstrap() {
    try {
        const imageVaultService = new ImageVaultService();

        const data = await storyblokService.getStoryBySlug(WORKING_STORY_SLUG)
        await promises.writeFile(getStoryFilename('demo-product-maksym'), JSON.stringify(data, null, 2));
        console.log('demo-product-maksym file created')

        const urls = await imageVaultService.getImageVaultUrls(data)

        const replacesUrls = []

        for (const url of urls) {
            const imageResponse = await axios.get(url, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(imageResponse.data, 'binary');
            const fileName = url.split('/').pop();
            const storyblokAssetData = await storyblokService.uploadAsset(buffer, fileName)
            replacesUrls.push({[url.split('/').pop()] : storyblokAssetData})
        }

        const components = await storyblokService.getComponentsList()

        if (!components?.components) return
        await promises.writeFile(getStoryFilename('components'), JSON.stringify(components, null, 2));
        console.log('components file created')

        const imagevaultMigrationCopyComponent = components.components.filter(item => item.name === WORKING_COMPONENT_NAME)?.[0]
        const imagevaultMigrationCopyComponentId = imagevaultMigrationCopyComponent?.id

        if (!imagevaultMigrationCopyComponentId) return

        const imageVaultMigrationComponent = await storyblokService.getComponentById(imagevaultMigrationCopyComponentId)
        if (!imageVaultMigrationComponent?.component?.schema) {
            return
        }

        await promises.writeFile(getStoryFilename('imageVaultMigrationComponent'), JSON.stringify(imageVaultMigrationComponent, null, 2));
        console.log('imageVaultMigrationComponent file created')

        const replaceComponentSchemaService = new ChangeComponentSchemaService(imageVaultMigrationComponent.component.schema)
        const newSchema = replaceComponentSchemaService.replace().get()
        imageVaultMigrationComponent.component.schema = {...newSchema}

        await promises.writeFile(getStoryFilename('imageVaultMigrationComponent-replaced'), JSON.stringify(imageVaultMigrationComponent, null, 2));
        console.log('imageVaultMigrationComponent-replaced file created')

        const updateComponentResponse = await storyblokService.updateComponentById(imageVaultMigrationComponent.component.id, imageVaultMigrationComponent)
        if (updateComponentResponse.status === 200) {
            console.log(`${imageVaultMigrationComponent.component.id} updated`)
        } else {
            console.log(`Failed to update story ID ${imageVaultMigrationComponent.component.id}`)
        }

        const replaceStoryImageService = new ReplaceStoryImagesService(data)
        const newData = replaceStoryImageService.replace(replacesUrls).get()
        await promises.writeFile(getStoryFilename('demo-product-maksym-replaced'), JSON.stringify(newData, null, 2));
        console.log('demo-product-maksym-replaced file created')

        if (newData.id) {
            const response = await storyblokService.updateStory(newData.id, newData, {
                force_update: 1,
                publish: 1,
            })

            if (response.status === 200) {
                console.log(`${newData.id} updated`)
            } else {
                console.log(`Failed to update story ID ${newData.id}`)
            }
        }
    } catch (err) {
        console.error(err);
    }

    return {}
}

export const {} = bootstrap();