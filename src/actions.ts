import { CompanionActionDefinition } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { ENullableBool } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import { SetExecutorValuesRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";
import {
    MacroSetButtonStateRequest,
    MacroSetFaderStateRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";

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
        const actions: Record<ActionId, CompanionActionDefinition | undefined> = {
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
                        label: "ID or Name"
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
                                request = MacroSetButtonStateRequest.create({
                                    macroId: event.options.id,
                                    buttonNumber: event.options.num,
                                    active: true
                                });
                                break;
                            case "executor":
                                request = SetExecutorValuesRequest.create();
                                request.executorId = event.options.id;
                                switch (event.options.num) {
                                    case 1:
                                        request.button1 = ENullableBool.True;
                                        break;
                                    case 2:
                                        request.button2 = ENullableBool.True;
                                        break;
                                    case 3:
                                        request.button3 = ENullableBool.True;
                                        break;
                                    case 4:
                                        request.button4 = ENullableBool.True;
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
                        label: "ID or Name"
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
                                request = MacroSetButtonStateRequest.create({
                                    macroId: event.options.id,
                                    buttonNumber: event.options.num,
                                    active: false
                                });
                                break;
                            case "executor":
                                request = SetExecutorValuesRequest.create();
                                request.executorId = event.options.id;
                                switch (event.options.num) {
                                    case 1:
                                        request.button1 = ENullableBool.False;
                                        break;
                                    case 2:
                                        request.button2 = ENullableBool.False;
                                        break;
                                    case 3:
                                        request.button3 = ENullableBool.False;
                                        break;
                                    case 4:
                                        request.button4 = ENullableBool.False;
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
                        label: "ID or Name"
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
                                request = MacroSetFaderStateRequest.create({
                                    macroId: event.options.id,
                                    increment: event.options.step / 100,
                                    faderNumber: event.options.num
                                });
                                break;
                            case "executor":
                                request = SetExecutorValuesRequest.create({
                                    executorId: event.options.id,
                                    faderIncrement: event.options.step / 100
                                });
                                break;
                        }

                        if (request) {
                            this.instance.UmbraClient?.sendFaderState(request);
                        }
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
                        label: "ID or Name"
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
                                request = MacroSetFaderStateRequest.create({
                                    macroId: event.options.id,
                                    increment: -event.options.step / 100,
                                    faderNumber: event.options.num
                                });
                                break;
                            case "executor":
                                request = SetExecutorValuesRequest.create({
                                    executorId: event.options.id,
                                    faderIncrement: -event.options.step / 100
                                });
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
                        label: "ID or Name"
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
                                request = MacroSetFaderStateRequest.create({
                                    macroId: event.options.id,
                                    absolut: event.options.value / 100,
                                    faderNumber: event.options.num
                                });
                                break;
                            case "executor":
                                request = SetExecutorValuesRequest.create({
                                    executorId: event.options.id,
                                    faderAbsolut: event.options.value / 100
                                });
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
