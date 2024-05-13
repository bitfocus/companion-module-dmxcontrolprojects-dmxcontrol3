import { MacroDescriptor } from "../../generated/Common/Types/Macro/MacroServiceTypes_pb";
import { IMacro } from "./imacro";
import { RepositoryBase } from "../repositorybase";

export class MacroRepository extends RepositoryBase<IMacro> {
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
        this.data.set(macroInstance.ID, macroInstance);
    }

    public updateMacro(macro: MacroDescriptor) {
        const macroInstance = this.data.get(macro.getId());

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
