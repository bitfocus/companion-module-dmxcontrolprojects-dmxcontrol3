import { ModuleInstance } from "./main";
import { combineRgb } from "@companion-module/base";

export function UpdateFeedbacks(self: ModuleInstance) {
  self.setFeedbackDefinitions({
    ChannelState: {
      name: "Example Feedback",
      type: "boolean",
      description: "Channel State",
      defaultStyle: {
        bgcolor: combineRgb(255, 0, 0),
        color: combineRgb(0, 0, 0)
      },
      options: [
        {
          id: "num",
          type: "number",
          label: "Test",
          default: 5,
          min: 0,
          max: 10
        }
      ],
      callback: (feedback) => {
        console.log("Hello world!", feedback.options.num);
        if (
          typeof feedback.options.num === "number" &&
          feedback.options.num > 5
        ) {
          return true;
        } else {
          return false;
        }
      }
    }
  });
}
