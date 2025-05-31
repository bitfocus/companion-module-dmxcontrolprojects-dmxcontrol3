import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import { ExecutorClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import {
    EChangeType,
    ENullableBool,
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    ExecutorChangedMessage,
    ExecutorDescriptor,
    SetExecutorValuesRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";
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

enum ExecutorActions {
    PressButton = "press_button_executor",
    ReleaseButton = "release_button_executor",
    IncrementFader = "increment_fader_executor",
    DecrementFader = "decrement_fader_executor",
    SetFaderAbsolute = "absolute_fader_executor"
}

enum ExecutorFeedbacks {
    ButtonState = "buttonstate_executor",
    ButtonName = "buttonname_executor",
    FaderName = "fadername_executor",
    FaderState = "faderstate_executor"
}

export class ExecutorClient implements IDMXCClient {
    grpcclient: ExecutorClientClient;

    repo: RepositoryBase<ExecutorDescriptor>;

    constructor(
        endpoint: string,
        private metadata: GRPC.Metadata,
        private instance: DMXCModuleInstance
    ) {
        this.repo = new RepositoryBase<ExecutorDescriptor>();
        this.grpcclient = new ExecutorClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
    }

    startClient(updatePresets: () => void) {
        this.grpcclient.getExecutors(
            GetMultipleRequest.create({
                requestId: this.instance.getRequestId()
            }),
            this.metadata,
            (error, response) => {
                if (error) {
                    this.instance.log("error", error.message);
                    return;
                }
                response.executors.forEach((executor) => {
                    this.repo.add(executor);
                });
                updatePresets();
                this.instance.checkFeedbacks(
                    ExecutorFeedbacks.ButtonName,
                    ExecutorFeedbacks.ButtonState,
                    ExecutorFeedbacks.FaderName,
                    ExecutorFeedbacks.FaderState
                );
            }
        );
        this.grpcclient
            .receiveExecutorChanges(
                GetRequest.create({ requestId: this.instance.getRequestId() }),
                this.metadata
            )
            .on("data", (response: ExecutorChangedMessage) => {
                this.instance.log(
                    "debug",
                    `ExecutorClient received change for executor: ${JSON.stringify(response.executorData)}`
                );
                switch (response.changeType) {
                    case EChangeType.Added:
                        if (response.executorData)
                            this.repo.add(response.executorData);
                        updatePresets();
                        break;
                    case EChangeType.Changed:
                        if (response.executorData)
                            this.repo.add(response.executorData);
                        this.instance.checkFeedbacks(
                            ExecutorFeedbacks.ButtonName,
                            ExecutorFeedbacks.ButtonState,
                            ExecutorFeedbacks.FaderName,
                            ExecutorFeedbacks.FaderState
                        );
                        break;
                    case EChangeType.Removed:
                        if (response.executorData)
                            this.repo.remove(response.executorData.id);
                        updatePresets();
                        break;
                }
            })
            .on("error", (error) => {
                this.instance.log("error", error.name);
            });
    }

    generateActions(): CompanionActionDefinitions {
        const actions: Record<ExecutorActions, CompanionActionDefinition> = {
            [ExecutorActions.PressButton]: {
                name: "Press Executor Button",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "ButtonNumber",
                        default: 1,
                        min: 1,
                        max: 4
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

                    const executor = this.repo.getSingle(event.options.id);

                    if (executor === undefined) return Promise.resolve();

                    const request = SetExecutorValuesRequest.create({
                        requestId: this.instance.getRequestId()
                    });

                    request.executorId = executor.id;
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
                    this.grpcclient.setExecutorValues(
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
            [ExecutorActions.ReleaseButton]: {
                name: "Release Executor Button",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "ButtonNumber",
                        default: 1,
                        min: 1,
                        max: 4
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

                    const executor = this.repo.getSingle(event.options.id);

                    if (executor === undefined) return Promise.resolve();

                    const request = SetExecutorValuesRequest.create({
                        requestId: this.instance.getRequestId()
                    });

                    request.executorId = executor.id;
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
                    this.grpcclient.setExecutorValues(
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
            [ExecutorActions.IncrementFader]: {
                name: "Increment Executor Fader",
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
                        id: "id",
                        type: "textinput",
                        label: "ID or Name"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.step !== "number"
                    )
                        return Promise.resolve();

                    const executor = this.repo.getSingle(event.options.id);

                    if (executor === undefined) return Promise.resolve();

                    const request = SetExecutorValuesRequest.create({
                        requestId: this.instance.getRequestId()
                    });

                    request.executorId = executor.id;
                    request.faderIncrement = event.options.step / 100;
                    this.grpcclient.setExecutorValues(
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
            [ExecutorActions.DecrementFader]: {
                name: "Decrement Executor Fader",
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
                        id: "id",
                        type: "textinput",
                        label: "ID or Name"
                    }
                ],
                callback: async (event) => {
                    if (
                        typeof event.options.id !== "string" ||
                        typeof event.options.step !== "number"
                    )
                        return Promise.resolve();

                    const executor = this.repo.getSingle(event.options.id);

                    if (executor === undefined) return Promise.resolve();

                    const request = SetExecutorValuesRequest.create({
                        requestId: this.instance.getRequestId()
                    });

                    request.executorId = executor.id;
                    request.faderIncrement = -event.options.step / 100;
                    this.grpcclient.setExecutorValues(
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
            [ExecutorActions.SetFaderAbsolute]: {
                name: "Set Executor Fader",
                options: [
                    {
                        id: "value",
                        type: "number",
                        label: "Fadervalue in %",
                        default: 5,
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
                        typeof event.options.value !== "number"
                    )
                        return Promise.resolve();

                    const executor = this.repo.getSingle(event.options.id);

                    if (executor === undefined) return Promise.resolve();

                    const request = SetExecutorValuesRequest.create({
                        requestId: this.instance.getRequestId()
                    });

                    request.executorId = executor.id;
                    request.faderAbsolut = event.options.value / 100;
                    this.grpcclient.setExecutorValues(
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
            }
        };

        return actions;
    }
    generateFeedbacks(): CompanionFeedbackDefinitions {
        const feedbacks: Record<
            ExecutorFeedbacks,
            CompanionFeedbackDefinition
        > = {
            [ExecutorFeedbacks.ButtonState]: {
                name: "Executor Button State",
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
                    const executor = this.repo.getSingle(feedback.options.id);
                    if (executor === undefined) return false;
                    switch (feedback.options.num) {
                        case 1:
                            return executor.button1Active;
                        case 2:
                            return executor.button2Active;
                        case 3:
                            return executor.button3Active;
                        case 4:
                            return executor.button4Active;
                    }
                    return false;
                }
            },
            [ExecutorFeedbacks.ButtonName]: {
                name: "Executor Button Name",
                type: "advanced",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "ButtonNumber",
                        default: 1,
                        min: 1,
                        max: 4
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
                    const executor = this.repo.getSingle(feedback.options.id);
                    if (executor === undefined) return { text: "" };
                    let name = "";
                    switch (feedback.options.num) {
                        case 1:
                            name =
                                executor.button1DisplayName ||
                                executor.button1Key;
                            break;
                        case 2:
                            name =
                                executor.button2DisplayName ||
                                executor.button2Key;
                            break;
                        case 3:
                            name =
                                executor.button3DisplayName ||
                                executor.button3Key;
                            break;
                        case 4:
                            name =
                                executor.button4DisplayName ||
                                executor.button4Key;
                            break;
                    }
                    return { text: name };
                }
            },
            [ExecutorFeedbacks.FaderState]: {
                name: "Executor Fader State",
                type: "advanced",
                options: [
                    {
                        id: "id",
                        type: "textinput",
                        label: "ID or Name"
                    }
                ],
                callback: (feedback) => {
                    if (typeof feedback.options.id !== "string")
                        return { text: "" };
                    const executor = this.repo.getSingle(feedback.options.id);
                    if (executor === undefined) return { text: "" };
                    return {
                        text: `${(executor.faderPosition * 100).toFixed(0)}%`
                    };
                }
            },
            [ExecutorFeedbacks.FaderName]: {
                name: "Executor Fader State",
                type: "advanced",
                options: [
                    {
                        id: "id",
                        type: "textinput",
                        label: "ID or Name"
                    }
                ],
                callback: (feedback) => {
                    if (typeof feedback.options.id !== "string")
                        return { text: "" };
                    const executor = this.repo.getSingle(feedback.options.id);
                    if (executor === undefined) return { text: "" };
                    return {
                        text: executor.faderDisplayName || executor.faderKey
                    };
                }
            }
        };
        return feedbacks;
    }
    generatePresets(): CompanionPresetDefinitions {
        const executorpresets: CompanionPresetDefinitions = {};
        for (const executor of this.repo.getAll()) {
            const name = executor.name;
            executorpresets[`${executor.id}_button_1`] = {
                type: "button",
                category: name,
                name: "Button1",
                style: {
                    text: "Button 1",
                    size: "auto",
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: ExecutorActions.PressButton,
                                options: {
                                    id: executor.name,
                                    num: 1
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: ExecutorActions.ReleaseButton,
                                options: {
                                    id: executor.name,
                                    num: 1
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: ExecutorFeedbacks.ButtonState,
                        options: {
                            id: executor.name,
                            num: 1
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    },
                    {
                        feedbackId: ExecutorFeedbacks.ButtonName,
                        options: {
                            id: executor.name,
                            num: 1
                        }
                    }
                ]
            };
            executorpresets[`${executor.id}_button_2`] = {
                type: "button",
                category: name,
                name: "Button2",
                style: {
                    text: "Button 2",
                    size: "auto",
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: ExecutorActions.PressButton,
                                options: {
                                    id: executor.name,
                                    num: 2
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: ExecutorActions.ReleaseButton,
                                options: {
                                    id: executor.name,
                                    num: 2
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: ExecutorFeedbacks.ButtonState,
                        options: {
                            id: executor.name,
                            num: 2
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    },
                    {
                        feedbackId: ExecutorFeedbacks.ButtonName,
                        options: {
                            id: executor.name,
                            num: 2
                        }
                    }
                ]
            };
            executorpresets[`${executor.id}_button_3`] = {
                type: "button",
                category: name,
                name: "Button3",
                style: {
                    text: "Button 3",
                    size: "auto",
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: ExecutorActions.PressButton,
                                options: {
                                    id: executor.name,
                                    num: 3
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: ExecutorActions.ReleaseButton,
                                options: {
                                    id: executor.name,
                                    num: 3
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: ExecutorFeedbacks.ButtonState,
                        options: {
                            id: executor.name,
                            num: 3
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    },
                    {
                        feedbackId: ExecutorFeedbacks.ButtonName,
                        options: {
                            id: executor.name,
                            num: 3
                        }
                    }
                ]
            };
            executorpresets[`${executor.id}_button_4`] = {
                type: "button",
                category: name,
                name: "Button4",
                style: {
                    text: "Button 4",
                    size: "auto",
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 0)
                },
                steps: [
                    {
                        down: [
                            {
                                actionId: ExecutorActions.PressButton,
                                options: {
                                    id: executor.name,
                                    num: 4
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: ExecutorActions.ReleaseButton,
                                options: {
                                    id: executor.name,
                                    num: 4
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: ExecutorFeedbacks.ButtonState,
                        options: {
                            id: executor.name,
                            num: 4
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    },
                    {
                        feedbackId: ExecutorFeedbacks.ButtonName,
                        options: {
                            id: executor.name,
                            num: 4
                        }
                    }
                ]
            };
            executorpresets[`${executor.id}_fader`] = {
                type: "button",
                category: name,
                name: "FaderState",
                style: {
                    text: "FaderState",
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
                                actionId: ExecutorActions.DecrementFader,
                                options: {
                                    id: executor.name,
                                    step: 5
                                }
                            }
                        ],
                        rotate_right: [
                            {
                                actionId: ExecutorActions.IncrementFader,
                                options: {
                                    id: executor.name,
                                    step: 5
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: ExecutorFeedbacks.FaderState,
                        options: {
                            id: executor.name
                        }
                    }
                ]
            };
            executorpresets[`${executor.id}_fader_inc`] = {
                type: "button",
                category: name,
                name: "Increment Fader",
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
                                actionId: ExecutorActions.IncrementFader,
                                options: {
                                    id: executor.name,
                                    step: 5
                                }
                            }
                        ],
                        up: []
                    }
                ],
                feedbacks: []
            };
            executorpresets[`${executor.id}_fader_dec`] = {
                type: "button",
                category: name,
                name: "Decrement Fader",
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
                                actionId: ExecutorActions.DecrementFader,
                                options: {
                                    id: executor.name,
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
        return executorpresets;
    }
    generateVariables(): CompanionVariableDefinition[] {
        return [];
    }

    close() {
        this.grpcclient.close();
    }
}
