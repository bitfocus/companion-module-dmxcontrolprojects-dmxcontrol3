import { CompanionPresetDefinitions, combineRgb } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { MacroDescriptor } from "./generated/Common/Types/Macro/MacroServiceTypes_pb";
import { ExecutorDescriptor } from "./generated/Common/Types/Executor/ExecutorServiceTypes_pb";

export class PresetsManager {
    private presets: CompanionPresetDefinitions;

    constructor(private self: DMXCModuleInstance) {
        this.presets = {};
    }

    createExecutorPresets(executorlist: ExecutorDescriptor[]) {
        for (const executor of executorlist) {
            const name = executor.getName();
            this.presets[`${executor.getId()}_button_1`] = {
                type: "button",
                category: name,
                name: executor.getButton1displayname(),
                style: {
                    text: executor.getButton1displayname(),
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
                                    num: 1,
                                    buttonType: "executor"
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: "release_button",
                                options: {
                                    id: executor.getId(),
                                    num: 1,
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
                            num: 1,
                            buttonType: "executor"
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            };
            this.presets[`${executor.getId()}_button_2`] = {
                type: "button",
                category: name,
                name: executor.getButton2displayname(),
                style: {
                    text: executor.getButton2displayname(),
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
                                    num: 2,
                                    buttonType: "executor"
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: "release_button",
                                options: {
                                    id: executor.getId(),
                                    num: 2,
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
                            num: 2,
                            buttonType: "executor"
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            };
            this.presets[`${executor.getId()}_button_3`] = {
                type: "button",
                category: name,
                name: executor.getButton3displayname(),
                style: {
                    text: executor.getButton3displayname(),
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
                                    num: 3,
                                    buttonType: "executor"
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: "release_button",
                                options: {
                                    id: executor.getId(),
                                    num: 3,
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
                            num: 3,
                            buttonType: "executor"
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            };
            this.presets[`${executor.getId()}_button_4`] = {
                type: "button",
                category: name,
                name: executor.getButton4displayname(),
                style: {
                    text: executor.getButton4displayname(),
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
                                    num: 4,
                                    buttonType: "executor"
                                }
                            }
                        ],
                        up: [
                            {
                                actionId: "release_button",
                                options: {
                                    id: executor.getId(),
                                    num: 4,
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
                            num: 4,
                            buttonType: "executor"
                        },
                        style: {
                            bgcolor: combineRgb(255, 0, 0)
                        }
                    }
                ]
            };
            this.presets[`${executor.getId()}_fader`] = {
                type: "button",
                category: name,
                name: executor.getFaderdisplayname(),
                style: {
                    text: executor.getFaderdisplayname(),
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
            this.presets[`${executor.getId()}_fader_inc`] = {
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
            this.presets[`${executor.getId()}_fader_dec`] = {
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
            this.self.setPresetDefinitions(this.presets);
        }
    }

    createMacroPresets(macrolist: MacroDescriptor[]) {
        for (const macro of macrolist) {
            const macroName = macro.getName();
            this.presets[`${macro.getId()}_image`] = {
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
                this.presets[`${macro.getId()}_button_${button.getNumber()}`] =
                    {
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
                            }
                        ]
                    };
            }
            for (const fader of macro.getFadersList()) {
                this.presets[`${macro.getId()}_fader_${fader.getNumber()}`] = {
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
                this.presets[
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
                this.presets[
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
        this.self.setPresetDefinitions(this.presets);
    }
}
