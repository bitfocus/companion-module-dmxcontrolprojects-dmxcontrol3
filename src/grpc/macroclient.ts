import { Metadata } from "@grpc/grpc-js";
import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import {
    EChangeType,
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    MacroChangedMessage,
    MacroSetFaderStateRequest,
    MacroSetButtonStateRequest,
    MacroDescriptor
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";
import { MacroClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import { IDMXCClient } from "./idmxcclient";
import {
    combineRgb,
    CompanionActionDefinition,
    CompanionActionDefinitions,
    CompanionFeedbackDefinition,
    CompanionFeedbackDefinitions,
    CompanionPresetDefinitions,
    CompanionVariableDefinition
} from "@companion-module/base";
import { RepositoryBase } from "../dmxcstate/repositorybase";

enum MacroActions {
    PressButton = "press_button_macro",
    ReleaseButton = "release_button_macro",
    IncrementFader = "increment_fader_macro",
    DecrementFader = "decrement_fader_macro",
    SetFaderAbsolute = "absolute_fader_macro"
}

enum MacroFeedbacks {
    ButtonState = "buttonstate_macro",
    ButtonName = "buttonname_macro",
    FaderName = "fadername_macro",
    FaderState = "faderstate_macro",
    Image = "bitmap_macro"
}

export class MacroClient implements IDMXCClient {
    grpcclient: MacroClientClient;
    repo: RepositoryBase<MacroDescriptor>;

    constructor(
        endpoint: string,
        private metadata: Metadata,
        private instance: DMXCModuleInstance
    ) {
        this.repo = new RepositoryBase<MacroDescriptor>();
        this.grpcclient = new MacroClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
    }

    startClient(updatePresets: () => void): void {
        this.grpcclient.getMacros(
            GetMultipleRequest.create({
                requestId: this.instance.getRequestId()
            }),
            this.metadata,
            (error, response) => {
                if (error) {
                    this.instance.log("error", error.message);
                    return;
                }
                response.macros.forEach((macro) => {
                    this.repo.add(macro);
                });
                updatePresets();
                this.instance.checkFeedbacks(
                    MacroFeedbacks.ButtonState,
                    MacroFeedbacks.ButtonName,
                    MacroFeedbacks.FaderName,
                    MacroFeedbacks.FaderState,
                    MacroFeedbacks.Image
                );
            }
        );
        this.grpcclient
            .receiveMacroChanges(
                GetRequest.create({ requestId: this.instance.getRequestId() }),
                this.metadata
            )
            .on("data", (response: MacroChangedMessage) => {
                this.instance.log(
                    "debug",
                    `MacroClient received change for macro: ${JSON.stringify(response.macroData)}`
                );
                switch (response.changeType) {
                    case EChangeType.Added:
                        if (response.macroData) {
                            this.repo.add(response.macroData);
                            updatePresets();
                        }
                        break;
                    case EChangeType.Changed:
                        if (response.macroData) {
                            this.repo.add(response.macroData);
                        }
                        break;
                    case EChangeType.Removed:
                        if (response.macroData) {
                            this.repo.remove(response.macroData.id);
                            updatePresets();
                        }
                        break;
                }
                this.instance.checkFeedbacks(
                    MacroFeedbacks.ButtonState,
                    MacroFeedbacks.ButtonName,
                    MacroFeedbacks.FaderName,
                    MacroFeedbacks.FaderState,
                    MacroFeedbacks.Image
                );
            })
            .on("error", (err) => {
                this.instance.log("error", err.name);
            });
    }

    generateActions(): CompanionActionDefinitions {
        const actions: Record<MacroActions, CompanionActionDefinition> = {
            [MacroActions.PressButton]: {
                name: "Press Macro Button",
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
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.num !== "number"
                    )
                        return Promise.resolve();

                    const macro = this.repo.getSingle(event.options.id);

                    if (macro === undefined) return Promise.resolve();

                    const request = MacroSetButtonStateRequest.create({
                        requestId: this.instance.getRequestId(),
                        buttonNumber: event.options.num,
                        macroId: event.options.id,
                        active: true
                    });
                    this.grpcclient.setMacroButtonState(
                        request,
                        this.metadata,
                        (error, response) => {
                            if (error)
                                this.instance.log("error", error.message);
                            if (!response.ok)
                                this.instance.log(
                                    "error",
                                    `Error pressing Executorbutton: ${response.message?.formatString ?? ""}`
                                );
                        }
                    );
                }
            },
            [MacroActions.ReleaseButton]: {
                name: "Release Macro Button",
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
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.num !== "number"
                    )
                        return Promise.resolve();

                    const macro = this.repo.getSingle(event.options.id);

                    if (macro === undefined) return Promise.resolve();

                    const request = MacroSetButtonStateRequest.create({
                        requestId: this.instance.getRequestId(),
                        buttonNumber: event.options.num,
                        macroId: event.options.id,
                        active: false
                    });
                    this.grpcclient.setMacroButtonState(
                        request,
                        this.metadata,
                        (error, response) => {
                            if (error)
                                this.instance.log("error", error.message);
                            if (!response.ok)
                                this.instance.log(
                                    "error",
                                    `Error pressing Executorbutton: ${response.message?.formatString ?? ""}`
                                );
                        }
                    );
                }
            },
            [MacroActions.IncrementFader]: {
                name: "Increment Macro Fader",
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
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.step !== "number" ||
                        typeof event.options.num !== "number"
                    )
                        return Promise.resolve();

                    const macro = this.repo.getSingle(event.options.id);

                    if (macro === undefined) return Promise.resolve();

                    const request = MacroSetFaderStateRequest.create();

                    request.requestId = this.instance.getRequestId();
                    request.macroId = event.options.id;
                    request.faderNumber = event.options.num;
                    request.increment = event.options.step / 100;
                    this.grpcclient.setMacroFaderState(
                        request,
                        this.metadata,
                        (error, response) => {
                            if (error)
                                this.instance.log("error", error.message);
                            if (!response.ok)
                                this.instance.log(
                                    "error",
                                    `Error setting Macrofader: ${response.message?.formatString ?? ""}`
                                );
                        }
                    );
                }
            },
            [MacroActions.DecrementFader]: {
                name: "Decrement Macro Fader",
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
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.step !== "number" ||
                        typeof event.options.num !== "number"
                    )
                        return Promise.resolve();

                    const macro = this.repo.getSingle(event.options.id);

                    if (macro === undefined) return Promise.resolve();

                    const request = MacroSetFaderStateRequest.create();

                    request.requestId = this.instance.getRequestId();

                    request.macroId = event.options.id;
                    request.faderNumber = event.options.num;
                    request.increment = -event.options.step / 100;
                    this.grpcclient.setMacroFaderState(
                        request,
                        this.metadata,
                        (error, response) => {
                            if (error)
                                this.instance.log("error", error.message);
                            if (!response.ok)
                                this.instance.log(
                                    "error",
                                    `Error setting Macrofader: ${response.message?.formatString ?? ""}`
                                );
                        }
                    );
                }
            },
            [MacroActions.SetFaderAbsolute]: {
                name: "Set Macro Fader",
                options: [
                    {
                        id: "value",
                        type: "number",
                        label: "Facervalue in %",
                        default: 50,
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
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.step !== "number" ||
                        typeof event.options.num !== "number"
                    )
                        return Promise.resolve();

                    const macro = this.repo.getSingle(event.options.id);

                    if (macro === undefined) return Promise.resolve();

                    const request = MacroSetFaderStateRequest.create();

                    request.requestId = this.instance.getRequestId();

                    request.macroId = event.options.id;
                    request.faderNumber = event.options.num;
                    request.absolut = event.options.step / 100;
                    this.grpcclient.setMacroFaderState(
                        request,
                        this.metadata,
                        (error, response) => {
                            if (error)
                                this.instance.log("error", error.message);
                            if (!response.ok)
                                this.instance.log(
                                    "error",
                                    `Error setting Macrofader: ${response.message?.formatString ?? ""}`
                                );
                        }
                    );
                }
            }
        };
        return actions;
    }
    generateFeedbacks(): CompanionFeedbackDefinitions {
        const feedbacks: Record<MacroFeedbacks, CompanionFeedbackDefinition> = {
            [MacroFeedbacks.ButtonState]: {
                name: "Macro Button State",
                type: "boolean",
                defaultStyle: {
                    bgcolor: combineRgb(255, 0, 0),
                    color: combineRgb(0, 0, 0)
                },
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
                    }
                ],
                callback: (feedback) => {
                    if (
                        typeof feedback.options.id !== "string" ||
                        typeof feedback.options.num !== "number"
                    )
                        return false;
                    const macro = this.repo.getSingle(feedback.options.id);
                    if (macro === undefined) return false;
                    return macro.buttons[feedback.options.num - 1].active;
                }
            },
            [MacroFeedbacks.ButtonName]: {
                name: "Macro Button Name",
                type: "advanced",
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
                    }
                ],
                callback: (feedback) => {
                    if (
                        typeof feedback.options.id !== "string" ||
                        typeof feedback.options.num !== "number"
                    )
                        return { text: "" };
                    const macro = this.repo.getSingle(feedback.options.id);
                    if (macro === undefined) return { text: "" };
                    return {
                        text: macro.buttons[feedback.options.num - 1].label
                    };
                }
            },
            [MacroFeedbacks.FaderName]: {
                name: "Macro Fader Name",
                type: "advanced",
                options: [
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
                    }
                ],
                callback: (feedback) => {
                    if (
                        typeof feedback.options.id !== "string" ||
                        typeof feedback.options.num !== "number"
                    )
                        return { text: "" };
                    const macro = this.repo.getSingle(feedback.options.id);
                    if (macro === undefined) return { text: "" };
                    return {
                        text: macro.faders[feedback.options.num - 1].label
                    };
                }
            },
            [MacroFeedbacks.FaderState]: {
                name: "Macro Fader State",
                type: "advanced",
                options: [
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
                    }
                ],
                callback: (feedback) => {
                    if (
                        typeof feedback.options.id !== "string" ||
                        typeof feedback.options.num !== "number"
                    )
                        return { text: "" };
                    const macro = this.repo.getSingle(feedback.options.id);
                    if (macro === undefined) return { text: "" };
                    return {
                        text: `${(macro.faders[feedback.options.num - 1].faderPosition * 100).toFixed(0)}%`
                    };
                }
            },
            [MacroFeedbacks.Image]: {
                name: "Macro Image",
                type: "advanced",
                options: [
                    {
                        id: "macroid",
                        type: "textinput",
                        label: "Macro ID or Name"
                    }
                ],
                callback: (feedback) => {
                    if (typeof feedback.options.macroid === "string") {
                        const image = this.repo.getSingle(
                            feedback.options.macroid
                        )?.bitmap;
                        if (image) {
                            const base64 =
                                Buffer.from(image).toString("base64");
                            return { png64: base64, show_topbar: false };
                        }
                    }
                    return {};
                }
            }
        };

        return feedbacks;
    }
    generatePresets(): CompanionPresetDefinitions {
        const macropresets: CompanionPresetDefinitions = {};
        for (const macro of this.repo.getAll()) {
            const name = macro.name;
            for (const button of macro.buttons) {
                macropresets[`${macro.id}_button_${button.number}`] = {
                    type: "button",
                    category: name,
                    name: `Button${button.number}`,
                    style: {
                        text: `Button ${button.number}`,
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: MacroActions.PressButton,
                                    options: {
                                        id: macro.name,
                                        num: button.number
                                    }
                                }
                            ],
                            up: [
                                {
                                    actionId: MacroActions.ReleaseButton,
                                    options: {
                                        id: macro.name,
                                        num: button.number
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: MacroFeedbacks.ButtonState,
                            options: {
                                id: macro.name,
                                num: button.number
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        },
                        {
                            feedbackId: MacroFeedbacks.ButtonName,
                            options: {
                                id: macro.name,
                                num: button.number
                            }
                        }
                    ]
                };
            }
            for (const fader of macro.faders) {
                macropresets[`${macro.id}_fader_${fader.number}`] = {
                    type: "button",
                    category: name,
                    name: `Fader${fader.number}`,
                    style: {
                        text: `Fader ${fader.number}`,
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    options: {
                        rotaryActions: true
                    },
                    steps: [
                        {
                            down: [],
                            up: [],
                            rotate_left: [
                                {
                                    actionId: MacroActions.DecrementFader,
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5
                                    }
                                }
                            ],
                            rotate_right: [
                                {
                                    actionId: MacroActions.IncrementFader,
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: MacroFeedbacks.FaderState,
                            options: {
                                id: macro.name,
                                num: fader.number
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        }
                    ]
                };
                macropresets[`${macro.id}_fader_${fader.number}_inc`] = {
                    type: "button",
                    category: name,
                    name: `Increment Fader ${fader.number}`,
                    style: {
                        text: "⬆️",
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: MacroActions.IncrementFader,
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5
                                    }
                                }
                            ],
                            up: []
                        }
                    ],
                    feedbacks: []
                };
                macropresets[`${macro.id}_fader_${fader.number}_dec`] = {
                    type: "button",
                    category: name,
                    name: `Decrement Fader ${fader.number}`,
                    style: {
                        text: "⬇️",
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: MacroActions.DecrementFader,
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5
                                    }
                                }
                            ],
                            up: []
                        }
                    ],
                    feedbacks: []
                };
            }
        }
        return macropresets;
    }
    generateVariables(): CompanionVariableDefinition[] {
        return [];
    }

    close() {
        this.grpcclient.close();
    }
}
