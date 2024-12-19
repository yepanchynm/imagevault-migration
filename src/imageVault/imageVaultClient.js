import { configService } from "../configService.js";
import axios from "axios";

const url = configService.get("IMAGE_VAULT_URL");
const username = configService.get("IMAGE_VAULT_USERNAME");
const password = configService.get("IMAGE_VAULT_PASSWORD");

if (!url) throw new Error("ImageVault URL is missing");
if (!username) throw new Error("ImageVault username is missing");
if (!password) throw new Error("ImageVault password is missing");

// Encode username and password for Basic Auth
const encodedCredentials = Buffer.from(`${username}:${password}`).toString("base64");

// Axios instance for token request
const tokenInstance = axios.create({
    baseURL: `${url}/apiv2/oauth/token`,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${encodedCredentials}`,
    },
});

// Axios instance for asset search
const imageVaultInstance = axios.create({
    baseURL: `${url}/apiv2/assets`,
});

export { tokenInstance, imageVaultInstance, url };
