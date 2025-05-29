import { CompanionPresetDefinitions, combineRgb } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { ExecutorDescriptor } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";
import { MacroDescriptor } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";

export class PresetsManager {
    private macropresets: CompanionPresetDefinitions;
    private executorpresets: CompanionPresetDefinitions;

    constructor(private module: DMXCModuleInstance) {
        this.macropresets = {};
        this.executorpresets = {};
    }

    createExecutorPresets(executorlist: ExecutorDescriptor[]) {
        this.executorpresets = {};
        for (const executor of executorlist) {
            const name = executor.name;
            for (let i = 1; i <= 4; i++) {
                let buttonname = "";
                switch (i) {
                    case 1:
                        buttonname = executor.button1DisplayName;
                        break;
                    case 2:
                        buttonname = executor.button2DisplayName;
                        break;
                    case 3:
                        buttonname = executor.button3DisplayName;
                        break;
                    case 4:
                        buttonname = executor.button4DisplayName;
                        break;
                    default:
                        break;
                }
                this.executorpresets[`${executor.id}_button_${i}`] = {
                    type: "button",
                    category: name,
                    name: buttonname,
                    style: {
                        text:
                            buttonname.length > 0 ? buttonname : `Button ${i}`,
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: "press_button",
                                    options: {
                                        id: executor.name,
                                        num: i,
                                        buttonType: "executor"
                                    }
                                }
                            ],
                            up: [
                                {
                                    actionId: "release_button",
                                    options: {
                                        id: executor.name,
                                        num: i,
                                        buttonType: "executor"
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: "ButtonState",
                            options: {
                                id: executor.name,
                                num: i,
                                buttonType: "executor"
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        }
                    ]
                };
            }
            this.executorpresets[`${executor.id}_fader`] = {
                type: "button",
                category: name,
                name: executor.faderDisplayName,
                style: {
                    text:
                        executor.faderDisplayName.length > 0
                            ? executor.faderDisplayName
                            : "Fader",
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
                                actionId: "decrement_fader",
                                options: {
                                    id: executor.name,
                                    num: 1,
                                    step: 5,
                                    faderType: "executor"
                                }
                            }
                        ],
                        rotate_right: [
                            {
                                actionId: "increment_fader",
                                options: {
                                    id: executor.name,
                                    num: 1,
                                    step: 5,
                                    faderType: "executor"
                                }
                            }
                        ]
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: "FaderState",
                        options: {
                            id: executor.name,
                            num: 1,
                            faderType: "executor"
                        }
                    }
                ]
            };
            this.executorpresets[`${executor.id}_fader_inc`] = {
                type: "button",
                category: name,
                name: executor.faderDisplayName,
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
                                actionId: "increment_fader",
                                options: {
                                    id: executor.name,
                                    num: 1,
                                    step: 5,
                                    faderType: "executor"
                                }
                            }
                        ],
                        up: []
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: "FaderState",
                        options: {
                            id: executor.name,
                            num: 1,
                            faderType: "executor"
                        }
                    }
                ]
            };
            this.executorpresets[`${executor.id}_fader_dec`] = {
                type: "button",
                category: name,
                name: executor.faderDisplayName,
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
                                actionId: "decrement_fader",
                                options: {
                                    id: executor.name,
                                    num: 1,
                                    step: 5,
                                    faderType: "executor"
                                }
                            }
                        ],
                        up: []
                    }
                ],
                feedbacks: [
                    {
                        feedbackId: "FaderState",
                        options: {
                            id: executor.name,
                            num: 1,
                            faderType: "executor"
                        }
                    }
                ]
            };
            this.module.setPresetDefinitions({});
            this.module.setPresetDefinitions({
                ...this.executorpresets,
                ...this.macropresets
            });
        }
    }

    createMacroPresets(macrolist: MacroDescriptor[]) {
        this.macropresets = {};
        for (const macro of macrolist) {
            const macroName = macro.name;
            this.macropresets[`${macro.id}_image`] = {
                type: "button",
                category: macroName,
                name: "Image",
                style: {
                    text: "",
                    size: "auto",
                    color: combineRgb(255, 255, 255),
                    bgcolor: combineRgb(0, 0, 0)
                },
                steps: [],
                feedbacks: [
                    {
                        feedbackId: "Bitmap",
                        options: {
                            macroid: macro.name
                        }
                    }
                ]
            };
            for (const button of macro.buttons) {
                this.macropresets[`${macro.id}_button_${button.number}`] = {
                    type: "button",
                    category: macroName,
                    name: button.label,
                    style: {
                        text: button.label,
                        size: "auto",
                        color: combineRgb(255, 255, 255),
                        bgcolor: combineRgb(0, 0, 0)
                    },
                    steps: [
                        {
                            down: [
                                {
                                    actionId: "press_button",
                                    options: {
                                        id: macro.name,
                                        num: button.number,
                                        buttonType: "macro"
                                    }
                                }
                            ],
                            up: [
                                {
                                    actionId: "release_button",
                                    options: {
                                        id: macro.name,
                                        num: button.number,
                                        buttonType: "macro"
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: "ButtonState",
                            options: {
                                id: macro.name,
                                num: button.number,
                                buttonType: "macro"
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        }
                    ]
                };
            }
            for (const fader of macro.faders) {
                this.macropresets[`${macro.id}_fader_${fader.number}`] = {
                    type: "button",
                    category: macroName,
                    name: fader.label,
                    style: {
                        text: fader.label,
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
                                    actionId: "decrement_fader",
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5,
                                        faderType: "macro"
                                    }
                                }
                            ],
                            rotate_right: [
                                {
                                    actionId: "increment_fader",
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5,
                                        faderType: "macro"
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: "FaderState",
                            options: {
                                id: macro.name,
                                num: fader.number,
                                faderType: "macro"
                            }
                        }
                    ]
                };
                this.macropresets[`${macro.id}_fader_${fader.number}_inc`] = {
                    type: "button",
                    category: macroName,
                    name: `${fader.label} +`,
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
                                    actionId: "increment_fader",
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5,
                                        faderType: "macro"
                                    }
                                }
                            ],
                            up: []
                        }
                    ],
                    feedbacks: []
                };
                this.macropresets[`${macro.id}_fader_${fader.number}_dec`] = {
                    type: "button",
                    category: macroName,
                    name: `${fader.label} -`,
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
                                    actionId: "decrement_fader",
                                    options: {
                                        id: macro.name,
                                        num: fader.number,
                                        step: 5,
                                        faderType: "macro"
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
        this.module.setPresetDefinitions({});
        this.module.setPresetDefinitions({
            ...this.executorpresets,
            ...this.macropresets
        });
    }
}
