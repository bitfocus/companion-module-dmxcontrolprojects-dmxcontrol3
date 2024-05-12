import { CompanionActionDefinition } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import {
    MacroSetButtonStateRequest,
    MacroSetFaderStateRequest
} from "./generated/Common/Types/Macro/MacroServiceCRUDTypes_pb";

export enum ActionId {
    PressButton = "press_button",
    ReleaseButton = "release_button",
    IncrementFader = "increment_fader",
    DecrementFader = "decrement_fader"
}

export class ActionFactory {
    private actions: Map<ActionId, CompanionActionDefinition | undefined>;

    constructor(private instance: DMXCModuleInstance) {
        this.actions = new Map<ActionId, CompanionActionDefinition>();
        this.addDefaultActions();
    }

    private addDefaultActions(): void {
        const actions: {
            [id in ActionId]: CompanionActionDefinition | undefined;
        } = {
            [ActionId.PressButton]: {
                name: "Press Button",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "ButtonNumber",
                        default: 1,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "macroid",
                        type: "textinput",
                        label: "Macro ID"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.macroid === "string" &&
                        typeof event.options.num === "number"
                    ) {
                        const request = new MacroSetButtonStateRequest();
                        request.setMacroid(event.options.macroid);
                        request.setButtonnumber(event.options.num);
                        request.setActive(true);

                        this.instance.UmbraClient?.sendButtonState(request);
                    }
                    return Promise.resolve();
                }
            },
            [ActionId.ReleaseButton]: {
                name: "Release Button",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "ButtonNumber",
                        default: 1,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "macroid",
                        type: "textinput",
                        label: "Macro ID"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.macroid === "string" &&
                        typeof event.options.num === "number"
                    ) {
                        const request = new MacroSetButtonStateRequest();
                        request.setMacroid(event.options.macroid);
                        request.setButtonnumber(event.options.num);
                        request.setActive(false);

                        this.instance.UmbraClient?.sendButtonState(request);
                    }
                    return Promise.resolve();
                }
            },
            [ActionId.IncrementFader]: {
                name: "Increment Fader",
                options: [
                    {
                        id: "step",
                        type: "number",
                        label: "StepSize in %",
                        default: 5,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "num",
                        type: "number",
                        label: "FaderNumber",
                        default: 1,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "macroid",
                        type: "textinput",
                        label: "Macro ID"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.macroid === "string" &&
                        typeof event.options.num === "number" &&
                        typeof event.options.step === "number"
                    ) {
                        const request = new MacroSetFaderStateRequest();

                        request.setMacroid(event.options.macroid);
                        request.setFadernumber(event.options.num);
                        request.setIncrement(event.options.step / 100);

                        this.instance.UmbraClient?.sendFaderState(request);
                    }
                    return Promise.resolve();
                }
            },
            [ActionId.DecrementFader]: {
                name: "Decrement Fader",
                options: [
                    {
                        id: "step",
                        type: "number",
                        label: "StepSize in %",
                        default: 5,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "num",
                        type: "number",
                        label: "FaderNumber",
                        default: 1,
                        min: 1,
                        max: 100
                    },
                    {
                        id: "macroid",
                        type: "textinput",
                        label: "Macro ID"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.macroid === "string" &&
                        typeof event.options.num === "number" &&
                        typeof event.options.step === "number"
                    ) {
                        const request = new MacroSetFaderStateRequest();

                        request.setMacroid(event.options.macroid);
                        request.setFadernumber(event.options.num);
                        request.setIncrement(-event.options.step / 100);

                        this.instance.UmbraClient?.sendFaderState(request);
                    }
                    return Promise.resolve();
                }
            }
        };
        Object.values(ActionId).forEach((id) => {
            this.actions.set(id, actions[id]);
        });
    }

    public updateActions(): void {
        this.instance.setActionDefinitions(Object.fromEntries(this.actions));
    }
}
