import { CompanionActionDefinition } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import {
    MacroSetButtonStateRequest,
    MacroSetFaderStateRequest
} from "./generated/Common/Types/Macro/MacroServiceCRUDTypes_pb";
import { SetExecutorValuesRequest } from "./generated/Common/Types/Executor/ExecutorServiceCRUDTypes_pb";
import { ENullableBool } from "./generated/Common/Types/CommonTypes_pb";

export enum ActionId {
    PressButton = "press_button",
    ReleaseButton = "release_button",
    IncrementFader = "increment_fader",
    DecrementFader = "decrement_fader",
    SetFaderAbsolute = "absolute_fader"
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
                        id: "id",
                        type: "textinput",
                        label: "ID"
                    },
                    {
                        id: "buttonType",
                        type: "dropdown",
                        label: "Select Buttontype",
                        choices: [
                            { id: "macro", label: "Macro" },
                            { id: "executor", label: "Executor" }
                        ],
                        default: "macro"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id === "string" &&
                        typeof event.options.num === "number"
                    ) {
                        let request;
                        switch (event.options.buttonType) {
                            case "macro":
                                request = new MacroSetButtonStateRequest();
                                request.setMacroid(event.options.id);
                                request.setButtonnumber(event.options.num);
                                request.setActive(true);
                                break;
                            case "executor":
                                request = new SetExecutorValuesRequest();
                                request.setExecutorid(event.options.id);
                                switch (event.options.num) {
                                    case 1:
                                        request.setButton1(ENullableBool.TRUE);
                                        break;
                                    case 2:
                                        request.setButton2(ENullableBool.TRUE);
                                        break;
                                    case 3:
                                        request.setButton3(ENullableBool.TRUE);
                                        break;
                                    case 4:
                                        request.setButton4(ENullableBool.TRUE);
                                        break;

                                    default:
                                        break;
                                }
                                break;
                            default:
                                break;
                        }
                        if (request)
                            this.instance.UmbraClient?.sendButtonState(request);
                        return Promise.resolve();
                    }
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
                        id: "id",
                        type: "textinput",
                        label: "ID"
                    },
                    {
                        id: "buttonType",
                        type: "dropdown",
                        label: "Select Buttontype",
                        choices: [
                            { id: "macro", label: "Macro" },
                            { id: "executor", label: "Executor" }
                        ],
                        default: "macro"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id === "string" &&
                        typeof event.options.num === "number"
                    ) {
                        let request;
                        switch (event.options.buttonType) {
                            case "macro":
                                request = new MacroSetButtonStateRequest();
                                request.setMacroid(event.options.id);
                                request.setButtonnumber(event.options.num);
                                request.setActive(false);
                                break;
                            case "executor":
                                request = new SetExecutorValuesRequest();
                                request.setExecutorid(event.options.id);
                                switch (event.options.num) {
                                    case 1:
                                        request.setButton1(ENullableBool.FALSE);
                                        break;
                                    case 2:
                                        request.setButton2(ENullableBool.FALSE);
                                        break;
                                    case 3:
                                        request.setButton3(ENullableBool.FALSE);
                                        break;
                                    case 4:
                                        request.setButton4(ENullableBool.FALSE);
                                        break;

                                    default:
                                        break;
                                }
                                break;
                            default:
                                break;
                        }
                        if (request)
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
                        id: "id",
                        type: "textinput",
                        label: "ID"
                    },
                    {
                        id: "faderType",
                        type: "dropdown",
                        label: "Select Fadertype",
                        choices: [
                            { id: "macro", label: "Macro" },
                            { id: "executor", label: "Executor" }
                        ],
                        default: "macro"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id === "string" &&
                        typeof event.options.num === "number" &&
                        typeof event.options.step === "number"
                    ) {
                        let request;

                        switch (event.options.faderType) {
                            case "macro":
                                request = new MacroSetFaderStateRequest();
                                request.setMacroid(event.options.id);
                                request.setIncrement(event.options.step / 100);
                                request.setFadernumber(event.options.num);
                                break;
                            case "executor":
                                request = new SetExecutorValuesRequest();
                                request.setExecutorid(event.options.id);
                                request.setFaderincrement(
                                    event.options.step / 100
                                );
                                request.setFaderset(true);
                                break;
                        }

                        if (request)
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
                        id: "id",
                        type: "textinput",
                        label: "ID"
                    },
                    {
                        id: "faderType",
                        type: "dropdown",
                        label: "Select Fadertype",
                        choices: [
                            { id: "macro", label: "Macro" },
                            { id: "executor", label: "Executor" }
                        ],
                        default: "macro"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id === "string" &&
                        typeof event.options.num === "number" &&
                        typeof event.options.step === "number"
                    ) {
                        let request;

                        switch (event.options.faderType) {
                            case "macro":
                                request = new MacroSetFaderStateRequest();
                                request.setMacroid(event.options.id);
                                request.setIncrement(-event.options.step / 100);
                                request.setFadernumber(event.options.num);
                                break;
                            case "executor":
                                request = new SetExecutorValuesRequest();
                                request.setExecutorid(event.options.id);
                                request.setFaderincrement(
                                    -event.options.step / 100
                                );
                                request.setFaderset(true);
                                break;
                        }

                        if (request)
                            this.instance.UmbraClient?.sendFaderState(request);
                    }
                    return Promise.resolve();
                }
            },
            [ActionId.SetFaderAbsolute]: {
                name: "Set Fader",
                options: [
                    {
                        id: "value",
                        type: "number",
                        label: "Fadervalue in %",
                        default: 50,
                        min: 0,
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
                        id: "id",
                        type: "textinput",
                        label: "ID"
                    },
                    {
                        id: "faderType",
                        type: "dropdown",
                        label: "Select Fadertype",
                        choices: [
                            { id: "macro", label: "Macro" },
                            { id: "executor", label: "Executor" }
                        ],
                        default: "macro"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id === "string" &&
                        typeof event.options.num === "number" &&
                        typeof event.options.step === "number" &&
                        typeof event.options.value === "number"
                    ) {
                        let request;

                        switch (event.options.faderType) {
                            case "macro":
                                request = new MacroSetFaderStateRequest();
                                request.setMacroid(event.options.id);
                                request.setAbsolut(event.options.value / 100);
                                request.setFadernumber(event.options.num);
                                break;
                            case "executor":
                                request = new SetExecutorValuesRequest();
                                request.setExecutorid(event.options.id);
                                request.setFaderabsolut(
                                    event.options.value / 100
                                );
                                request.setFaderset(true);
                                break;
                        }

                        if (request)
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
