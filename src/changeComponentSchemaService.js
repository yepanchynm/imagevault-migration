import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import { MARKDOWN_PLUGIN_NAME } from "./main.js";

export class ChangeComponentSchemaService {
    #schema;
    #result;

    constructor(schema) {
        this.#schema = schema || {};
    }

    async replace() {
        this.#result = {};

        for (const [key, value] of Object.entries(this.#schema)) {
            this.#result[key] = value;

            if (value.type === MARKDOWN_PLUGIN_NAME) {
                const newKey = `${key}_richtext`;

                this.#result[newKey] = {
                    ...value,
                    type: "richtext",
                };
            }
        }

        return this;
    }

    get() {
        return this.#result;
    }
}
