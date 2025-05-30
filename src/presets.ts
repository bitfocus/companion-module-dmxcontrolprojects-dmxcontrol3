import { CompanionPresetDefinitions, combineRgb } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { IExecutor } from "./dmxcstate/executor/iexecutor";
import { IMacro } from "./dmxcstate/macro/imacro";

export class PresetsManager {
    private macropresets: CompanionPresetDefinitions;
    private executorpresets: CompanionPresetDefinitions;

    constructor(private module: DMXCModuleInstance) {
        this.macropresets = {};
        this.executorpresets = {};
    }

    createExecutorPresets(executorlist: IExecutor[]) {
        this.executorpresets = {};
        for (const executor of executorlist) {
            const name = executor.name;
            let i = 1;
            for (const button of executor.buttons) {
                this.executorpresets[`${executor.ID}_button_${i}`] = {
                    type: "button",
                    category: name,
                    name: button.label,
                    style: {
                        text:
                            button.label.length > 0
                                ? button.label
                                : `Button ${i}`,
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
                        },
                        {
                            feedbackId: "ButtonName",
                            options: {
                                id: executor.name,
                                num: i,
                                buttonType: "executor"
                            }
                        }
                    ]
                };
                i++;
            }
            this.executorpresets[`${executor.ID}_fader`] = {
                type: "button",
                category: name,
                name: executor.fader.label,
                style: {
                    text:
                        executor.fader.label.length > 0
                            ? executor.fader.label
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
            this.executorpresets[`${executor.ID}_fader_inc`] = {
                type: "button",
                category: name,
                name: executor.fader.label,
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
            this.executorpresets[`${executor.ID}_fader_dec`] = {
                type: "button",
                category: name,
                name: executor.name,
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

    createMacroPresets(macrolist: IMacro[]) {
        this.macropresets = {};
        for (const macro of macrolist) {
            const macroName = macro.name;
            this.macropresets[`${macro.ID}_image`] = {
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
                this.macropresets[`${macro.ID}_button_${button.number}`] = {
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
                        },
                        {
                            feedbackId: "ButtonName",
                            options: {
                                id: macro.name,
                                num: button.number,
                                buttonType: "macro"
                            }
                        }
                    ]
                };
            }
            for (const fader of macro.faders) {
                this.macropresets[`${macro.ID}_fader_${fader.number}`] = {
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
                this.macropresets[`${macro.ID}_fader_${fader.number}_inc`] = {
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
                this.macropresets[`${macro.ID}_fader_${fader.number}_dec`] = {
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
