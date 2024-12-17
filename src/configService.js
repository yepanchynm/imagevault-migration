import {config} from "dotenv";

class ConfigService {
    #config;

    constructor() {
        const result = config()

        if (result.error || !result.parsed) {
            console.error('Environment file parse error')
        } else {
            this.#config = result.parsed
        }
    }

    /**
     * @param {string} key
     * @return {(string|undefined)}
     */
    get(key) {
        return this.#config[key]
    }
}

export const configService =  new ConfigService();