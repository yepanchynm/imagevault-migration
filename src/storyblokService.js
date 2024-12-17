import { getInstance, updateInstance } from "./storyblokClient.js";

class StoryblokService {
    constructor () {}

    async getAllStories () {
        const perPage = 25;
        let params = {
            per_page: perPage,
            page: 1,
        };

        let firstResponse = await getInstance.get("/stories", params);
        let lastPage = firstResponse.total
            ? Math.ceil(firstResponse.total / perPage)
            : 1;

        let otherStories = [];
        for (let currentPage = 2; currentPage <= lastPage; currentPage++) {
            params.page = currentPage;
            otherStories.push((await getInstance.get("/stories", params)).data.stories);
        }

        return [firstResponse.data.stories, ...otherStories].flat();
    }

    async getStoryBySlug(storySlug) {
        const { data } = await getInstance.get(`/stories/${storySlug}`)
        return data.story
    }

    async updateStory(storyId, newData, opts = {}) {
        return await updateInstance.put(`/stories/${storyId}`, {
            story: newData,
            ...opts
        })
    }
}

export const storyblokService = new StoryblokService();