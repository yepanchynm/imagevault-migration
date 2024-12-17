import {configService} from "./configService.js";
import axios from "axios";

const token = configService.get('STORYBLOK_PUBLIC_KEY');
const oauthToken = configService.get('STORYBLOK_PERSONAL_ACCESS_TOKEN');
const spaceId = configService.get('STORYBLOK_SPACE_ID');
if (typeof token === "undefined") throw new Error("Storybloktoken missing");
if (typeof oauthToken === "undefined") throw new Error("oauthToken Storybloktoken missing");
if (typeof spaceId === "undefined") throw new Error("spaceId missing");

const getInstance = axios.create({
    baseURL: "https://api.storyblok.com/v2/cdn",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
    params: {
        token,
    },
});

const updateInstance = axios.create({
    baseURL: `https://mapi.storyblok.com/v1/spaces/${spaceId}`,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": oauthToken
    },
});

export { getInstance, updateInstance };