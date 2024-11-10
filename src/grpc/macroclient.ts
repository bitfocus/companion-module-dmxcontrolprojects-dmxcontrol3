import { Metadata } from "@grpc/grpc-js";
import { MacroClientClient } from "../generated/Client/MacroClient_grpc_pb";
import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import {
    GetMultipleRequest,
    GetRequest
} from "../generated/Common/Types/CommonTypes_pb";
import { loggedMethod } from "../utils";
import {
    GetMacrosResponse,
    MacroChangedMessage,
    MacroSetButtonStateRequest,
    MacroSetFaderStateRequest
} from "../generated/Common/Types/Macro/MacroServiceCRUDTypes_pb";
import { MacroRepository } from "../dmxcstate/macro/macrorepository";

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
            new GetMultipleRequest(),
            this.metadata,
            (error, response) => {
                if (error) {
                    instance.log("error", error.message);
                    return;
                }
                this.getMacroHandler(response);
            }
        );
        this.mclient
            .receiveMacroChanges(new GetRequest(), this.metadata)
            .on("data", (response: MacroChangedMessage) => {
                this.macroChangeHandler(response);
            })
            .on("error", (err) => {
                instance.log("error", err.message);
            });
    }

    getMacroHandler(response: GetMacrosResponse): void {
        response.getMacrosList().forEach((macro) => {
            this.repo.addMacro(macro);
        });
        this.instance.presets?.createMacroPresets(response.getMacrosList());
    }

    macroChangeHandler(response: MacroChangedMessage) {
        const macro = response.getMacrodata();
        if (macro) {
            this.repo.updateMacro(macro);
            this.instance.checkFeedbacks(
                "ButtonState",
                "ButtonName",
                "FaderState",
                "Bitmap"
            );
        }
    }

    sendFaderState(request: MacroSetFaderStateRequest) {
        this.instance.log("debug", request.toString());
        this.mclient.setMacroFaderState(
            request,
            this.metadata,
            loggedMethod((response) => {
                this.instance.log("debug", response.toString());
                if (!response.getOk()) {
                    this.instance.log(
                        "error",
                        `Error setting FaderState: ${request.getMacroid()}-${request.getFadernumber()}`
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
                if (!response.getOk()) {
                    this.instance.log(
                        "error",
                        `Error setting ButtonState: ${request.getMacroid()}-${request.getButtonnumber()}`
                    );
                }
            })
        );
    }
}
