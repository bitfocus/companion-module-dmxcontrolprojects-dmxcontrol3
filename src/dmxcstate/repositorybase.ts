import { CompanionInputFieldDropdown, CompanionOptionValues } from "@companion-module/base";

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

    public generateIdOpion(label: string): CompanionInputFieldDropdown {
        const allOptions = this.getAll().map(list => ({ id: list.id, label: list.name }));
        return {
            id: "id_or_name",
            type: "dropdown",
            label,
            choices: allOptions,
            allowCustom: true,
            default: allOptions[0]?.id ?? ""
        };
    }

    public checkAndGetIdOption(options: CompanionOptionValues): T {
        const id = options?.id_or_name;
        if (typeof id !== "string") {
            throw new Error("To set cuelist intensity, cuelist id and intensity must be set");
        }
        const list = this.getSingle(id);
        if (list === undefined) {
            throw new Error(`Cuelist ${id} does not exist.`);
        }
        return list;
    }
}
