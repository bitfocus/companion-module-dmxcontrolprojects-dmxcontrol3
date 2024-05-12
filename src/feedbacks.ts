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
                    id: "macroid",
                    type: "textinput",
                    label: "Macro ID"
                }
            ],
            callback: (feedback) => {
                if (
                    typeof feedback.options.macroid === "string" &&
                    typeof feedback.options.num === "number"
                ) {
                    return (
                        self.macrorepo?.getMacro(feedback.options.macroid)
                            ?.buttons[feedback.options.num - 1].active ?? false
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
                    id: "macroid",
                    type: "textinput",
                    label: "Macro ID"
                }
            ],
            callback: (feedback) => {
                if (
                    typeof feedback.options.macroid === "string" &&
                    typeof feedback.options.num === "number"
                ) {
                    const fadervalue =
                        self.macrorepo?.getMacro(feedback.options.macroid)
                            ?.faders[feedback.options.num - 1].position ?? 0;
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
                    const image = self.macrorepo?.getMacro(
                        feedback.options.macroid
                    )?.image;
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
