import { getInstance, updateInstance } from "./storyblokClient.js";
import {configService} from "./configService.js";
import FormData from 'form-data';
import axios from "axios";

const folderId = configService.get('STORYBLOK_FOLDER_ID');
if (typeof folderId === "undefined") throw new Error("Storyblokasset missing");

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

    async uploadAsset(buffer, fileName) {
        const { data: presignData } = await updateInstance.post(`/assets`, {
            filename: fileName,
            folder_id: folderId,
            acl: 'public-read'
        });

        const { post_url: upload_url, fields } = presignData;
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) {
            formData.append(key, value);
        }
        formData.append('file', buffer, { filename: fileName });
        await axios.post(upload_url, formData, {
            headers: formData.getHeaders(),
        });

        const publicUrl = presignData.public_url;

        const fixedUrl = publicUrl.replace('s3.amazonaws.com/', '');
    
        return fixedUrl;
    }
}

export const storyblokService = new StoryblokService();