import { IButton, IColor, IFader } from "../common";

interface IExecutorButton extends IButton {
    key: string;
}

interface IExecutorFader extends IFader {
    key: string;
}

export interface IExecutor {
    ID: string;
    memberID: string;
    number: number;
    name: string;
    buttons: IExecutorButton[];
    fader: IExecutorFader;
    color?: IColor;
}
