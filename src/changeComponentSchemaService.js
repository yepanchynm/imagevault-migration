import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";
import {IMAGEVAULT_PLUGIN_NAME, NEW_PLUGIN_NAME} from "./main.js";

export class ChangeComponentSchemaService {
    #schema
    #result

    constructor(schema) {
        if (!schema) {
            this.#schema = {};
        }
        this.#schema = schema;
    }

    replace() {
        this.#result = bypassObjectEntries(this.#schema, 'field_type', IMAGEVAULT_PLUGIN_NAME, (item) => {
            return {
                ...item,
                field_type: NEW_PLUGIN_NAME
            }
        })
        return this
    }

    get() {
        return this.#result
    }
}