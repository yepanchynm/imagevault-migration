import { bypassObjectEntries } from "./helpers/bypassObjectEntries.js";
import { MARKDOWN_PLUGIN_NAME } from "./main.js";

export class ChangeComponentSchemaService {
    #schema;
    #result;

    constructor(schema) {
        if (!schema) {
            this.#schema = {};
        }
        this.#schema = schema;
    }

    async replace() {
        this.#result = await bypassObjectEntries(this.#schema, async (item, result) => {
            if (item.type === MARKDOWN_PLUGIN_NAME) {
                result.type = "richtext";
            }
        });
        return this;
    }

    get() {
        return this.#result;
    }
}