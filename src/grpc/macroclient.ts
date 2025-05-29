import { Metadata } from "@grpc/grpc-js";
import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import { loggedMethod } from "../utils";
import { MacroRepository } from "../dmxcstate/macro/macrorepository";
import {
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    MacroChangedMessage,
    GetMacrosResponse,
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
            loggedMethod((response) => {
                this.getMacroHandler(response);
            })
        );
        this.mclient
            .receiveMacroChanges(GetRequest.create(), this.metadata)
            .on("data", (response: MacroChangedMessage) => {
                this.macroChangeHandler(response);
            });
    }

    getMacroHandler(response: GetMacrosResponse): void {
        response.macros.forEach((macro) => {
            this.repo.addMacro(macro);
        });
        this.instance.presets?.createMacroPresets(response.macros);
    }

    macroChangeHandler(response: MacroChangedMessage) {
        const macro = response.macroData;
        if (macro) {
            this.repo.updateMacro(macro);
            this.instance.checkFeedbacks("ButtonState", "FaderState", "Bitmap");
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
