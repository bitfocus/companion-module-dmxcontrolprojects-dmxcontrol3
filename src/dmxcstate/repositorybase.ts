import {
    CompanionInputFieldDropdown,
    CompanionInputFieldTextInput,
    CompanionOptionValues
} from "@companion-module/base";

enum IdNameFieldType {
    Dropdown = "dropdown",
    TextVariables = "textinput"
}

export class RepositoryBase<T extends { id: string; name: string }> {
    protected data: Map<string, T> = new Map<string, T>();
    protected namelookup: Map<string, string> = new Map<string, string>();

    public add(instance: T) {
        this.data.set(instance.id, instance);
        this.namelookup.set(instance.name, instance.id);
    }

    public update(instance: Partial<T> & { id: string }) {
        if (!this.data.has(instance.id)) {
            this.add(instance as T);
            return;
        }
        const existing = this.data.get(instance.id)!;
        const oldName = existing.name;
        Object.assign(existing, instance);
        if (typeof instance.name === "string" && oldName != instance.name) {
            this.namelookup.delete(oldName);
            this.namelookup.set(instance.name, instance.id);
        }
    }

    public getSingle(id: string): T | undefined {
        return (
            this.data.get(id) ?? this.data.get(this.namelookup.get(id) ?? "")
        );
    }

    public getAll(): T[] {
        return Array.from(this.data.values());
    }

    public getIds(): string[] {
        return Array.from(this.data.keys());
    }

    public remove(id: string) {
        this.data.delete(id);
        for (const element of this.namelookup.entries()) {
            if (element[1] === id) {
                this.namelookup.delete(element[0]);
                break;
            }
        }
    }

    public clear() {
        this.data.clear();
    }

    /**
     * Generates companion input fields to allow the user to select (dropdown) or enter (text field with valiables)
     * the id of any element in this repository
     *
     * @param label The label for the id input or dropdown field
     * @returns 3 Companion input fields (choice between dropdown/text, conditional dropdown, conditional text input)
     */
    public generateIdOpion(
        label: string
    ): (CompanionInputFieldDropdown | CompanionInputFieldTextInput)[] {
        const allOptions = this.getAll().map((element) => ({
            id: element.id,
            label: element.name
        }));
        return [
            {
                type: "dropdown",
                label: "Type of ID/name field",
                id: "id_or_name_type",
                default: IdNameFieldType.Dropdown,
                choices: [
                    { id: IdNameFieldType.Dropdown, label: "Dropdown coice" },
                    {
                        id: IdNameFieldType.TextVariables,
                        label: "Text/Variables"
                    }
                ]
            },
            {
                id: "id_or_name_choice",
                type: "dropdown",
                label,
                choices: allOptions,
                allowCustom: true,
                default: allOptions[0]?.id ?? "",
                isVisibleExpression: `$(options:id_or_name_type) == "${IdNameFieldType.Dropdown}"`
            },
            {
                id: "id_or_name_text",
                type: "textinput",
                label: label + " (with variables)",
                default: "",
                isVisibleExpression: `$(options:id_or_name_type) == "${IdNameFieldType.TextVariables}"`,
                useVariables: {
                    local: true
                }
            }
        ];
    }

    /**
     * Retrieves the selected element from this repository slected using the fields created with `generateIdOpion`
     *
     * @param options The (full, unmodified) `options` object returned in the event (e.g. in an action) by companion
     * @param parseVariablesInString The `parseVariablesInString` in the context (second param) passed to events (e.g. actions)
     * @returns Promise resolving to the selected element
     * @throws Rejects promise if user input couldn't be resolved to an element in this repository
     */
    public async checkAndGetIdOption(
        options: CompanionOptionValues,
        parseVariablesInString: (text: string) => Promise<string>
    ): Promise<T> {
        const id_type = options?.id_or_name_type as string;
        if (typeof id_type !== "string") {
            throw new Error(
                "A valid way to input id/name must be selected: " +
                    JSON.stringify(options)
            );
        }
        let id: string;
        switch (id_type) {
            case IdNameFieldType.Dropdown:
                id = options.id_or_name_choice as string;
                break;
            case IdNameFieldType.TextVariables:
                id = await parseVariablesInString(
                    options.id_or_name_text as string
                );
                break;
            default:
                throw new Error("Unknown way to input id/name");
        }
        if (typeof id !== "string") {
            throw new Error(
                "Provided id was not a string. Could not find element."
            );
        }
        const element = this.getSingle(id);
        if (element === undefined) {
            throw new Error(`Element ${id} does not exist.`);
        }
        return element;
    }
}
