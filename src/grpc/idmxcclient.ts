import {
    CompanionActionDefinitions,
    CompanionFeedbackDefinitions,
    CompanionPresetDefinitions,
    CompanionVariableDefinition
} from "@companion-module/base";
import { Client } from "@grpc/grpc-js";

export interface IDMXCClient {
    grpcclient: Client;

    startClient(updatePresets: () => void): void;

    generateActions(): CompanionActionDefinitions;

    generateFeedbacks(): CompanionFeedbackDefinitions;

    generatePresets(): CompanionPresetDefinitions;

    generateVariables(): CompanionVariableDefinition[];

    close(): void;
}
