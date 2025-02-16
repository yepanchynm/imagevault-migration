import {configService} from "./configService.js";
import axios from "axios";

const token = configService.get('STORYBLOK_PUBLIC_KEY');
const v1Token = configService.get('STORYBLOK_V1_TOKEN');
const oauthToken = configService.get('STORYBLOK_PERSONAL_ACCESS_TOKEN');
const spaceId = configService.get('STORYBLOK_SPACE_ID');
if (typeof token === "undefined") throw new Error("Storybloktoken missing");
if (typeof v1Token === "undefined") throw new Error("StoryblokV1token missing");
if (typeof oauthToken === "undefined") throw new Error("oauthToken Storybloktoken missing");
if (typeof spaceId === "undefined") throw new Error("spaceId missing");

const delay = Math.floor(1000 / 6) + 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const getV1Instance = axios.create({
    baseURL: `https://app.storyblok.com/v1/spaces/${spaceId}`,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        authorization: v1Token
    }
})

const delayHandler = async (response) => {
    await sleep(delay);
    return response;
}

getInstance.interceptors.response.use(delayHandler)
updateInstance.interceptors.response.use(delayHandler)

export { getInstance, updateInstance, getV1Instance };