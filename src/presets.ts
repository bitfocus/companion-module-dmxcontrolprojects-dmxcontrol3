import { CompanionPresetDefinitions, combineRgb } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";
import { MacroDescriptor } from "./generated/Common/Types/Macro/MacroServiceTypes_pb";

export class PresetsManager {
    private presets: CompanionPresetDefinitions;

    constructor(private self: DMXCModuleInstance) {
        this.presets = {};
    }

    createMacroButtonPresets(macrolist: MacroDescriptor[]) {
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
                                            macroid: macro.getId(),
                                            num: button.getNumber()
                                        }
                                    }
                                ],
                                up: [
                                    {
                                        actionId: "release_button",
                                        options: {
                                            macroid: macro.getId(),
                                            num: button.getNumber()
                                        }
                                    }
                                ]
                            }
                        ],
                        feedbacks: [
                            {
                                feedbackId: "ButtonState",
                                options: {
                                    macroid: macro.getId(),
                                    num: button.getNumber()
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
                                        macroid: macro.getId(),
                                        num: fader.getNumber(),
                                        step: 5
                                    }
                                }
                            ],
                            rotate_right: [
                                {
                                    actionId: "increment_fader",
                                    options: {
                                        macroid: macro.getId(),
                                        num: fader.getNumber(),
                                        step: 5
                                    }
                                }
                            ]
                        }
                    ],
                    feedbacks: [
                        {
                            feedbackId: "FaderState",
                            options: {
                                macroid: macro.getId(),
                                num: fader.getNumber()
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
                                        macroid: macro.getId(),
                                        num: fader.getNumber(),
                                        step: 5
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
                                        macroid: macro.getId(),
                                        num: fader.getNumber(),
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
        this.self.setPresetDefinitions(this.presets);
    }
}
