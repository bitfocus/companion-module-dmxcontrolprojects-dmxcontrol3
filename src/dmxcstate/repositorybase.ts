export class RepositoryBase<T> {
    protected data: Map<string, T> = new Map<string, T>();

    public getSingle(id: string): T | undefined {
        return this.data.get(id);
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
