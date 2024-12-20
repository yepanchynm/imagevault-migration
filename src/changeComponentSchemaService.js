import {bypassObjectEntries} from "./helpers/bypassObjectEntries.js";

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
        this.#result = bypassObjectEntries(this.#schema, 'field_type', 'image-vault', (item) => {
            return {
                type: "bloks",
                maximum: "1",
                restrict_components: true,
                component_whitelist: [
                    "imageComponent"
                ],
                pos: item?.pos || 0,
                description: item?.description || "",
                id: item?.id || ""
            }
        })
        return this
    }

    get() {
        return this.#result
    }
}