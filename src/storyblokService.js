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

    async getComponentsList() {
        const { data } = await updateInstance.get(`/components`)
        return data
    }

    async getComponentById(id) {
        const { data } = await updateInstance.get(`/components/${id}`)
        return data
    }

    async updateComponentById(id, newData) {
        return await updateInstance.put(`/components/${id}`, newData)
    }

    async updateStory(storyId, newData, opts = {}) {
        return await updateInstance.put(`/stories/${storyId}`, {
            story: newData,
            ...opts
        })
    }

    async updateAsset(id, data) {
        return await updateInstance.put(`/assets/${id}`, data)
    }

    async getTags() {
        const response = await updateInstance.get('/internal_tags')

        return response.data.internal_tags;
    }

    async createTag(name) {
        return await updateInstance.post('/internal_tags', { name })
    }

    async uploadAsset(buffer, fileName) {
        const { data: presignData } = await updateInstance.post(`/assets`, {
            filename: fileName,
            asset_folder_id: folderId,
            acl: 'public-read'
        });

        const { post_url: upload_url, fields, id, meta_data } = presignData;
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
    
        return {
            id,
            filename: fixedUrl,
            meta_data
        };
    }
}

export const storyblokService = new StoryblokService();