import { ExecutorRepository } from "./dmxcstate/executor/executorrepository";
import { MacroRepository } from "./dmxcstate/macro/macrorepository";
import { DMXCModuleInstance } from "./main";
import { combineRgb } from "@companion-module/base";

export function UpdateFeedbacks(self: DMXCModuleInstance) {
    self.setFeedbackDefinitions({
        ButtonState: {
            name: "Button State",
            type: "boolean",
            description: "Button Pressed",
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
            callback: (feedback) => {
                if (
                    typeof feedback.options.id === "string" &&
                    typeof feedback.options.num === "number"
                ) {
                    let type = "";

                    switch (feedback.options.buttonType) {
                        case "macro":
                            type = "MacroRepository";
                            break;
                        case "executor":
                            type = "ExecutorRepository";
                            break;
                    }

                    return (
                        self.repositories
                            ?.get(type)
                            ?.getSingle(feedback.options.id)?.buttons[
                            feedback.options.num - 1
                        ].active ?? false
                    );
                }
                return false;
            }
        },
        FaderState: {
            name: "Fader State",
            type: "advanced",
            description: "Fader Position",
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
            callback: (feedback) => {
                if (
                    typeof feedback.options.id === "string" &&
                    typeof feedback.options.num === "number"
                ) {
                    let fadervalue = 0;

                    switch (feedback.options.faderType) {
                        case "macro":
                            fadervalue =
                                (
                                    self.repositories?.get(
                                        "MacroRepository"
                                    ) as MacroRepository
                                ).getSingle(feedback.options.id)?.faders[
                                    feedback.options.num - 1
                                ].position ?? 0;
                            break;
                        case "executor":
                            fadervalue =
                                (
                                    self.repositories?.get(
                                        "ExecutorRepository"
                                    ) as ExecutorRepository
                                ).getSingle(feedback.options.id)?.fader
                                    .position ?? 0;
                            break;
                    }

                    return {
                        text: `${(fadervalue * 100).toFixed(0)}%`,
                        style: { color: combineRgb(255, 255, 255) }
                    };
                }

                return {
                    text: "0%",
                    style: { color: combineRgb(255, 255, 255) }
                };
            }
        },
        Bitmap: {
            name: "Macro Image",
            type: "advanced",
            description: "Macro Image",
            options: [
                {
                    id: "macroid",
                    type: "textinput",
                    label: "Macro ID"
                }
            ],
            callback: (feedback) => {
                if (typeof feedback.options.macroid === "string") {
                    const image = (
                        self.repositories?.get(
                            "MacroRepository"
                        ) as MacroRepository
                    ).getSingle(feedback.options.macroid)?.image;
                    if (image) {
                        const base64 = Buffer.from(image).toString("base64");
                        return { png64: base64, show_topbar: false };
                    }
                }
                return {};
            }
        }
    });
}
