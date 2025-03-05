import { getInstance, updateInstance, getV1Instance } from "./storyblokClient.js";

class StoryblokService {
    constructor () {}

    async getAllStories () {
        console.log('Starting saving all stories...');
        const perPage = 25;
        let page = 1;

        let url = `/stories?version=draft&per_page=${perPage}&page=${page}`
        
        const firstResponse = await getInstance.get(url);

        const total = firstResponse.headers['total'];

        console.log('Total count of stories: ' + total);

        const lastPage = total ? Math.ceil(total / perPage) : 1

        let otherStories = [];
        for (let currentPage = 2; currentPage <= lastPage; currentPage++) {
            page = currentPage;
            url = `/stories?version=draft&per_page=${perPage}&page=${page}`
            const res =  await getInstance.get(url);
            otherStories.push(res.data.stories);
        }

        return [firstResponse.data.stories].flat();
    }

    async getStoryBySlug(storySlug) {
        const { data } = await getInstance.get(`/stories/${storySlug}?version=draft`)
        return data.story
    }

    async updateStory(storyId, newData, opts = {}) {
        if (
            newData.full_slug === 'en/investor/newsroom/press-kit-media-assets' ||
            newData.full_slug === 'sv/investor/media/mediabank'
        ) { return { status: 500 } }
        return await updateInstance.put(`/stories/${storyId}`, {
            story: newData,
            ...opts
        })
    }

    // Check if story is published or no
    async isStoryPublished(fullSlag) {
        let page = 1;
        const perPage = 100;
    
        while (true) {
            const response = await getV1Instance.get(`/stories?with_summary=1&has_filter=true&page=${page}&per_page=${perPage}&text_search=${fullSlag}`);
            const stories = response.data.stories;

            if (!stories || stories.length === 0) {
                return false;
            }
    
            for (const story of stories) {

                if (story.full_slug === fullSlag) {
                    return story.published && !story.unpublished_changes;
                }
            }
    
            page++;
        }
    }
}

export const storyblokService = new StoryblokService();