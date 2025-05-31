export class RepositoryBase<T extends { id: string; name: string }> {
    protected data: Map<string, T> = new Map<string, T>();
    protected namelookup: Map<string, string> = new Map<string, string>();

    public add(instance: T) {
        this.data.set(instance.id, instance);
        this.namelookup.set(instance.name, instance.id);
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
}
