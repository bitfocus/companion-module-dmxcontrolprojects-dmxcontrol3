import { IMacro } from "./imacro";
import { RepositoryBase } from "../repositorybase";
import { MacroDescriptor } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";

export class MacroRepository extends RepositoryBase<IMacro> {
    public addMacro(macro: MacroDescriptor) {
        const macroInstance: IMacro = {
            ID: macro.id,
            name: macro.name,
            buttons: macro.buttons.map((b) => {
                return {
                    label: b.label,
                    number: b.number,
                    active: b.active
                };
            }),
            faders: macro.faders.map((f) => {
                return {
                    label: f.label,
                    number: f.number,
                    position: f.faderPosition
                };
            }),
            image: macro.bitmap
        };
        this.data.set(macroInstance.ID, macroInstance);
        this.namelookup.set(macroInstance.name, macroInstance.ID);
    }

    public updateMacro(macro: MacroDescriptor) {
        const macroInstance = this.data.get(macro.id);

        if (macroInstance) {
            macroInstance.name = macro.name;
            macroInstance.buttons = macro.buttons.map((b) => {
                return {
                    label: b.label,
                    number: b.number,
                    active: b.active
                };
            });
            macroInstance.faders = macro.faders.map((f) => {
                return {
                    label: f.label,
                    number: f.number,
                    position: f.faderPosition
                };
            });
            macroInstance.image = macro.bitmap;
            this.namelookup.set(macroInstance.name, macroInstance.ID);
        } else {
            this.addMacro(macro);
        }
    }
}
