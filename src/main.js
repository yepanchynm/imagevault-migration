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
            const storyblokData = await storyblokService.uploadAsset(buffer, fileName)
            replacesUrls.push({[url.split('/').pop()] : storyblokData.filename})

            const imageVaultImageData = await imageVaultService.searchImageData(storyblokData.filename.split('/').pop())
            if (imageVaultImageData.categories && imageVaultImageData.categories.length > 0) {
                let storyblockTags = await storyblokService.getTags()
                let assetTags = []
                for (const category of imageVaultImageData.categories) {
                    let tag = storyblockTags
                        ? storyblockTags.find(tag => tag.name.toLowerCase() === category.name.toLowerCase())
                        : undefined

                    if (!tag) {
                        const createdTag = await storyblokService.createTag(category.name);
                        storyblockTags = await storyblokService.getTags();
                        tag = createdTag.internal_tag
                    }
                    
                    assetTags.push(tag.id)
                }

                await storyblokService.updateAsset(storyblokData.id, { asset : { internal_tag_ids: assetTags } });
            }
        }

        const components = await storyblokService.getComponentsList()

        if (!components?.components) return
        await promises.writeFile(getStoryFilename('components'), JSON.stringify(components, null, 2));
        console.log('components file created')

        const componentsWithImageVault = components?.components.filter(item => {
            return Object.values(item.schema).some((fieldValue) => {
                return fieldValue?.["field_type"] === "image-vault"
            })
        })

        console.log(`Found ${componentsWithImageVault.length} components with "image-vault" plugin`)

        await promises.writeFile(getStoryFilename('components-with-imagevault'), JSON.stringify(componentsWithImageVault, null, 2));
        console.log('components with image vault file created')

        const componentsWithImageVaultNames = componentsWithImageVault.reduce((acc, curr) => {
            if (curr?.name) {
                acc.push(curr.name)
            }
            return acc
        }, [])

        await promises.writeFile(getStoryFilename('components-with-imagevault-names'), JSON.stringify(componentsWithImageVaultNames, null, 2));
        console.log('components with image names vault file created')

        const componentsWhichHasWhilistedImageVault = components?.components.filter(item => {
            return Object.values(item.schema).some((fieldValue) => {
                return fieldValue?.["component_whitelist"]?.length > 0 && fieldValue?.["component_whitelist"].some(w => componentsWithImageVaultNames.includes(w))
            })
        })

        await promises.writeFile(getStoryFilename('components-which-has-whilisted-ImageVault'), JSON.stringify(componentsWhichHasWhilistedImageVault, null, 2));
        console.log('components which has whilisted ImageVault file created')

        console.log(`Found ${componentsWhichHasWhilistedImageVault.length} components which has components with "image-vault" plugin`)

        const componentsWhichHasWhilistedImageVaultNames = componentsWhichHasWhilistedImageVault.reduce((acc, curr) => {
            if (curr?.name) {
                acc.push(curr.name)
            }
            return acc
        }, [])

        await promises.writeFile(getStoryFilename('components-which-has-whilisted-ImageVault-names'), JSON.stringify(componentsWhichHasWhilistedImageVaultNames, null, 2));
        console.log('components which has whilisted ImageVault Names file created')

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