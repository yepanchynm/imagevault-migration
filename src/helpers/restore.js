import { storyblokService } from "../storyblokService.js";

export async function restoreStoriesFromFile(stories) { 
    for (const story of stories) {
        try {
            const isPublished = await storyblokService.isStorypublished(story.full_slug);
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