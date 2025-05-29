import { IDMXCObject } from "./common";

export class RepositoryBase<T extends IDMXCObject> {
    protected data: Map<string, T> = new Map<string, T>();
    protected namelookup: Map<string, string> = new Map<string, string>();

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
    }

    public clear() {
        this.data.clear();
    }
}
