import { storyblokService } from "../storyblokService";

export async function restoreStoriesFromFile(stories) {
    try {
        const updatePromises = stories.map(story => {
            return storyblokService.updateStory(story.id, story);
        });

        await Promise.all(updatePromises);
        console.log('All stories have been restored successfully');
        return ;
    } catch (err) {
        console.error('Error restoring stories:', err);
    }
}