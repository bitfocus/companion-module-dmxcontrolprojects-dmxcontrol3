import { UserClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import { IDMXCClient } from "./idmxcclient";
import * as GRPC from "@grpc/grpc-js";
// import { Metadata } from "@grpc/grpc-js";
// import { DMXCModuleInstance } from "../main";
import {
    CompanionActionDefinitions,
    CompanionFeedbackDefinitions,
    CompanionPresetDefinitions,
    CompanionVariableDefinition
} from "@companion-module/base";

export class UserClient implements IDMXCClient {
    grpcclient: UserClientClient;

    constructor(
        endpoint: string
        //private metadata: Metadata,
        //private instance: DMXCModuleInstance
    ) {
        this.grpcclient = new UserClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
    }

    startClient(): void {
        throw new Error("Method not implemented.");
    }
    generateActions(): CompanionActionDefinitions {
        throw new Error("Method not implemented.");
    }
    generateFeedbacks(): CompanionFeedbackDefinitions {
        throw new Error("Method not implemented.");
    }
    generatePresets(): CompanionPresetDefinitions {
        throw new Error("Method not implemented.");
    }
    generateVariables(): CompanionVariableDefinition[] {
        throw new Error("Method not implemented.");
    }

    close() {
        this.grpcclient.close();
    }
}
