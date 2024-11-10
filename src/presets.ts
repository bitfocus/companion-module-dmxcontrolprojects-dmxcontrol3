import { CompanionPresetDefinitions, combineRgb } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { MacroDescriptor } from "./generated/Common/Types/Macro/MacroServiceTypes_pb";
import { ExecutorDescriptor } from "./generated/Common/Types/Executor/ExecutorServiceTypes_pb";

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
            const name = executor.getName();

            // Arrow functions to avoid unintentional scoping
            const namefunctions = [
                () => executor.getButton1displayname(),
                () => executor.getButton2displayname(),
                () => executor.getButton3displayname(),
                () => executor.getButton4displayname()
            ];

            for (let i = 0; i < 4; i++) {
                const buttonName = namefunctions[i]();

                this.executorpresets[`${executor.getId()}_button_${i + 1}`] = {
                    type: "button",
                    category: name,
                    name: buttonName,
                    style: {
                        text:
                            buttonName.length > 0
                                ? buttonName
                                : `Button ${i + 1}`,
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
                                        id: executor.getId(),
                                        num: i + 1,
                                        buttonType: "executor"
                                    }
                                }
                            ],
                            up: [
                                {
                                    actionId: "release_button",
                                    options: {
                                        id: executor.getId(),
                                        num: i + 1,
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
                                id: executor.getId(),
                                num: i + 1,
                                buttonType: "executor"
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        },
                        {
                            feedbackId: "ButtonName",
                            options: {
                                id: executor.getId(),
                                num: i + 1,
                                buttonType: "executor"
                            }
                        }
                    ]
                };
            }
            this.executorpresets[`${executor.getId()}_fader`] = {
                type: "button",
                category: name,
                name: executor.getFaderdisplayname(),
                style: {
                    text:
                        executor.getFaderdisplayname().length > 0
                            ? executor.getFaderdisplayname()
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
                                    id: executor.getId(),
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
                                    id: executor.getId(),
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
                            id: executor.getId(),
                            num: 1,
                            faderType: "executor"
                        }
                    }
                ]
            };
            this.executorpresets[`${executor.getId()}_fader_inc`] = {
                type: "button",
                category: name,
                name: executor.getFaderdisplayname(),
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
                                    id: executor.getId(),
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
                            id: executor.getId(),
                            num: 1,
                            faderType: "executor"
                        }
                    }
                ]
            };
            this.executorpresets[`${executor.getId()}_fader_dec`] = {
                type: "button",
                category: name,
                name: executor.getFaderdisplayname(),
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
                                    id: executor.getId(),
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
                            id: executor.getId(),
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
            const macroName = macro.getName();
            this.macropresets[`${macro.getId()}_image`] = {
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
                            macroid: macro.getId()
                        }
                    }
                ]
            };
            for (const button of macro.getButtonsList()) {
                this.macropresets[
                    `${macro.getId()}_button_${button.getNumber()}`
                ] = {
                    type: "button",
                    category: macroName,
                    name: button.getLabel(),
                    style: {
                        text: button.getLabel(),
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
                                        id: macro.getId(),
                                        num: button.getNumber(),
                                        buttonType: "macro"
                                    }
                                }
                            ],
                            up: [
                                {
                                    actionId: "release_button",
                                    options: {
                                        id: macro.getId(),
                                        num: button.getNumber(),
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
                                id: macro.getId(),
                                num: button.getNumber(),
                                buttonType: "macro"
                            },
                            style: {
                                bgcolor: combineRgb(255, 0, 0)
                            }
                        },
                        {
                            feedbackId: "ButtonName",
                            options: {
                                id: macro.getId(),
                                num: button.getNumber(),
                                buttonType: "macro"
                            }
                        }
                    ]
                };
            }
            for (const fader of macro.getFadersList()) {
                this.macropresets[
                    `${macro.getId()}_fader_${fader.getNumber()}`
                ] = {
                    type: "button",
                    category: macroName,
                    name: fader.getLabel(),
                    style: {
                        text: fader.getLabel(),
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
                                        id: macro.getId(),
                                        num: fader.getNumber(),
                                        step: 5,
                                        faderType: "macro"
                                    }
                                }
                            ],
                            rotate_right: [
                                {
                                    actionId: "increment_fader",
                                    options: {
                                        id: macro.getId(),
                                        num: fader.getNumber(),
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
                                id: macro.getId(),
                                num: fader.getNumber(),
                                faderType: "macro"
                            }
                        }
                    ]
                };
                this.macropresets[
                    `${macro.getId()}_fader_${fader.getNumber()}_inc`
                ] = {
                    type: "button",
                    category: macroName,
                    name: `${fader.getLabel()} +`,
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
                                        id: macro.getId(),
                                        num: fader.getNumber(),
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
                this.macropresets[
                    `${macro.getId()}_fader_${fader.getNumber()}_dec`
                ] = {
                    type: "button",
                    category: macroName,
                    name: `${fader.getLabel()} -`,
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
                                        id: macro.getId(),
                                        num: fader.getNumber(),
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
