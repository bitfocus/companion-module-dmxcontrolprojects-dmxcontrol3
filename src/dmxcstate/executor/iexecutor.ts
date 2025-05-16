import { IButton, IColor, IDMXCObject, IFader } from "../common";

interface IExecutorButton extends IButton {
    key: string;
}

interface IExecutorFader extends IFader {
    key: string;
}

export interface IExecutor extends IDMXCObject {
    memberID: string;
    number: number;
    buttons: IExecutorButton[];
    fader: IExecutorFader;
    color?: IColor;
}
