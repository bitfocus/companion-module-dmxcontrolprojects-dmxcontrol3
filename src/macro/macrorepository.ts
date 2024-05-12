import { MacroDescriptor } from "../generated/Common/Types/Macro/MacroServiceTypes_pb";
import { IMacro } from "./imacro";

export class MacroRepository {
    private macros: Map<string, IMacro> = new Map<string, IMacro>();

    public addMacro(macro: MacroDescriptor) {
        const macroInstance: IMacro = {
            ID: macro.getId(),
            name: macro.getName(),
            buttons: macro.getButtonsList().map((b) => {
                return {
                    label: b.getLabel(),
                    number: b.getNumber(),
                    active: b.getActive()
                };
            }),
            faders: macro.getFadersList().map((f) => {
                return {
                    label: f.getLabel(),
                    number: f.getNumber(),
                    position: f.getFaderposition()
                };
            }),
            image: macro.getBitmap()
        };
        this.macros.set(macroInstance.ID, macroInstance);
    }

    public getMacro(id: string): IMacro | undefined {
        return this.macros.get(id);
    }

    public getMacros(): IMacro[] {
        return Array.from(this.macros.values());
    }

    public getMacroIds(): string[] {
        return Array.from(this.macros.keys());
    }

    public removeMacro(id: string) {
        this.macros.delete(id);
    }

    public clear() {
        this.macros.clear();
    }

    public updateMacro(macro: MacroDescriptor) {
        const macroInstance = this.macros.get(macro.getId());

        if (macroInstance) {
            macroInstance.name = macro.getName();
            macroInstance.buttons = macro.getButtonsList().map((b) => {
                return {
                    label: b.getLabel(),
                    number: b.getNumber(),
                    active: b.getActive()
                };
            });
            macroInstance.faders = macro.getFadersList().map((f) => {
                return {
                    label: f.getLabel(),
                    number: f.getNumber(),
                    position: f.getFaderposition()
                };
            });
            macroInstance.image = macro.getBitmap();
        } else {
            this.addMacro(macro);
        }
    }
}
