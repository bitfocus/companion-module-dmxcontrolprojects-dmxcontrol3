export interface IButton {
    label: string;
    active: boolean;
}

export interface IFader {
    label: string;
    position: number;
}

export interface IColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface IDMXCObject {
    ID: string;
    name: string;
}