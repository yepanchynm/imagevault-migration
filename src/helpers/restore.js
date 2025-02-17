import { storyblokService } from "../storyblokService.js";

export async function restoreStoriesFromFile(stories) { 
    for (const story of stories) {
        try {
            const isPublished = await storyblokService.isStoryPublished(story.full_slug);
            const response = await storyblokService.updateStory(
                story.id, 
                story, 
                isPublished ? {  force_update: 1, publish: 1 } : {}
            );

            if (response.status === 200) {
                console.log(`Story ${story.id} restored successfully`);
            } else {
                console.log(`Failed to restore story ID ${story.id}`);
            }
        } catch (err) {
            console.log(`Failed to restore story ID ${story.id}`);
        }
    }

    console.log('All stories have been restored successfully');

    return;
}

export async function restoreComponentsFromFile(components) {
    for (const component of components) {
        try {
            const response = await storyblokService.updateComponentById(component.id, component);
            
            if (response.status === 200) {
                console.log(`Component ${component.id} restored successfully`);
            } else {
                console.log(`Failed to restore component ID ${component.id}`);
            }
        } catch (err) {
            console.log(`Failed to restore component ID ${component.id}`);
        }
    }

    console.log('All components have been restored successfully');

    return;
}