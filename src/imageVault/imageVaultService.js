import { tokenInstance, imageVaultInstance, url as imageVaultUrl } from './imageVaultClient.js';
import axios from "axios";

class ImageVaultService {
    constructor() {
        this.token = null;
    }

    async searchImageData(query) {
        try {
            const token = await this._getAuthToken();
            const response = await imageVaultInstance.get("", {
                params: { $search: query },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data.value[0];
        } catch (error) {
            console.error("Error performing search:", error.response?.data || error.message);

            if (error.response?.status === 401) {
                this.token = null;
            }

            throw new Error("Failed to search image");
        }
    }

    async getImageVaultUrls(stories) {
        const storiesArray = Array.isArray(stories) ? stories : [stories];

        return this._filterUniqueUrls(storiesArray.flatMap((story) =>
            this._extractImageVaultUrls(story)
        ));
    }

    async _getAuthToken() {
        if (this.token) {
            return this.token;
        }

        try {
            const response = await tokenInstance.post("", "grant_type=client_credentials");
            this.token = response.data.access_token;
            return this.token;
        } catch (error) {
            console.error("Error fetching token:", error.response?.data || error.message);
            throw new Error("Failed to fetch auth token");
        }
    }

    /**
     * @param {Object|Array} content
     * @returns {Array}
     */
    _extractImageVaultUrls(content) {
        const urls = [];

        function recursiveExtract(data) {
            if (Array.isArray(data)) {
                data.forEach(recursiveExtract);
            } else if (typeof data === "object" && data !== null) {
                if (data.plugin === "image-vault" && data.item?.MediaConversions) {
                    data.item.MediaConversions.forEach((media) => {
                        if (media.Url.startsWith(imageVaultUrl)) {
                            urls.push(media.Url);
                        }
                    });
                }

                for (const key in data) {
                    recursiveExtract(data[key]);
                }
            }
        }

        recursiveExtract(content);
        return urls;
    }

    _filterUniqueUrls(urls) {
        const seenFiles = new Set();
        return urls.filter((url) => {
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            if (seenFiles.has(fileName)) {
                return false;
            }
            seenFiles.add(fileName);
            return true;
        });
    }  
}

export default ImageVaultService;
