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
                type: item?.type || 'bloks',
                maximum: item.maximum || "1",
                restrict_components: item.restrict_components || true,
                component_whitelist: item.component_whitelist?.length > 0 ? [...item.component_whitelist, 'image-component'] : [],
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