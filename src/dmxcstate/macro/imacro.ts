import { IButton, IDMXCObject, IFader } from "../common";

interface IMacroButton extends IButton {
    number: number;
}

interface IMacroFader extends IFader {
    number: number;
}

export interface IMacro extends IDMXCObject {
    buttons: IMacroButton[];
    faders: IMacroFader[];
    image: Uint8Array | string;
}
