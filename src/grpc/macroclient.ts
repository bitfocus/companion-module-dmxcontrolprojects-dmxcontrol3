import { Metadata } from "@grpc/grpc-js";
import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import { loggedMethod } from "../utils";
import { MacroRepository } from "../dmxcstate/macro/macrorepository";
import {
    EChangeType,
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    MacroChangedMessage,
    MacroSetFaderStateRequest,
    MacroSetButtonStateRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";
import { MacroClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";

export class MacroClient {
    private mclient: MacroClientClient;
    private repo: MacroRepository;

    constructor(
        endpoint: string,
        private metadata: Metadata,
        private instance: DMXCModuleInstance
    ) {
        this.repo = instance.repositories?.get(
            "MacroRepository"
        ) as MacroRepository;
        this.mclient = new MacroClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
        this.mclient.getMacros(
            GetMultipleRequest.create(),
            this.metadata,
            (error, response) => {
                if (error) {
                    instance.log("error", error.message);
                    return;
                }
                response.macros.forEach((macro) => {
                    this.repo.addMacro(macro);
                });
                this.instance.presets?.createMacroPresets(this.repo.getAll());
                this.instance.checkFeedbacks(
                    "ButtonState",
                    "ButtonName",
                    "FaderState",
                    "Bitmap"
                );
            }
        );
        this.mclient
            .receiveMacroChanges(GetRequest.create(), this.metadata)
            .on("data", (response: MacroChangedMessage) => {
                this.instance.log(
                    "debug",
                    `MacroClient received change for macro: ${JSON.stringify(response.macroData)}`
                );
                switch (response.changeType) {
                    case EChangeType.Added:
                        if (response.macroData) {
                            this.repo.addMacro(response.macroData);
                            this.instance.presets?.createMacroPresets(
                                this.repo.getAll()
                            );
                        }
                        break;
                    case EChangeType.Changed:
                        if (response.macroData) {
                            this.repo.updateMacro(response.macroData);
                        }
                        break;
                    case EChangeType.Removed:
                        if (response.macroData) {
                            this.repo.remove(response.macroData.id);
                            this.instance.presets?.createMacroPresets(
                                this.repo.getAll()
                            );
                        }
                        break;
                }
                this.instance.checkFeedbacks(
                    "ButtonState",
                    "ButtonName",
                    "FaderName",
                    "FaderState",
                    "Bitmap"
                );
            })
            .on("error", (err) => {
                instance.log("error", err.message);
            });
    }

    macroChangeHandler(response: MacroChangedMessage) {
        const macro = response.macroData;
        if (macro) {
            this.instance.checkFeedbacks(
                "ButtonState",
                "ButtonName",
                "FaderName",
                "FaderState",
                "Bitmap"
            );
        }
    }

    sendFaderState(request: MacroSetFaderStateRequest) {
        this.instance.log("debug", `Macro:${request.macroId}`);
        this.mclient.setMacroFaderState(
            request,
            this.metadata,
            loggedMethod((response) => {
                this.instance.log("debug", `${response.message?.formatString}`);
                if (!response.ok) {
                    this.instance.log(
                        "error",
                        `Error setting FaderState: ${request.macroId}-${request.faderNumber}`
                    );
                }
            })
        );
    }

    sendButtonState(request: MacroSetButtonStateRequest) {
        this.mclient.setMacroButtonState(
            request,
            this.metadata,
            loggedMethod((response) => {
                if (!response.ok) {
                    this.instance.log(
                        "error",
                        `Error setting ButtonState: ${request.macroId}-${request.buttonNumber}`
                    );
                }
            })
        );
    }
}
