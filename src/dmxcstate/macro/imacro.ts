import { IButton, IFader } from "../common";

interface IMacroButton extends IButton {
    number: number;
}

interface IMacroFader extends IFader {
    number: number;
}

export interface IMacro {
    ID: string;
    name: string;
    buttons: IMacroButton[];
    faders: IMacroFader[];
    image: Uint8Array | string;
}
