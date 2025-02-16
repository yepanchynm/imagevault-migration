import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";
import {IMAGEVAULT_PLUGIN_NAME} from "./main.js";

export class ChangeComponentSchemaService {
    #schema
    #result

    constructor(schema) {
        if (!schema) {
            this.#schema = {};
        }
        this.#schema = schema;
    }

    async replace() {
        this.#result = await bypassObjectEntries(this.#schema, 'field_type', IMAGEVAULT_PLUGIN_NAME, (item) => {
            const { pos, id } = item
            return {
                type: "asset",
                filetypes: [
                    "images"
                ],
                id,
                pos,

            }
        })
        return this
    }

    get() {
        return this.#result
    }
}