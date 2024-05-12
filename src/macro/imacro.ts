interface IButton {
    number: number;
    label: string;
    active: boolean;
}

interface IFader {
    number: number;
    label: string;
    position: number;
}

export interface IMacro {
    ID: string;
    name: string;
    buttons: IButton[];
    faders: IFader[];
    image: Uint8Array | string;
}
