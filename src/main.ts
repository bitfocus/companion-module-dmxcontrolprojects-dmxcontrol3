import {
    InstanceBase,
    runEntrypoint,
    InstanceStatus
} from "@companion-module/base";
import { UpgradeScripts } from "./upgrades";
import { Config, configFields } from "./config";
import { ActionFactory } from "./actions";
import { UpdateFeedbacks } from "./feedbacks";
import { UpdateVariables } from "./variables";
import { GRPCClient } from "./grpc-client";
import { startDiscovery } from "./utils";

export class DMXCModuleInstance extends InstanceBase<Config> {
    public config?: Config;

    public UmbraClient?: GRPCClient;

    public actions?: ActionFactory;

    async init(config: Config) {
        this.config = config;

        this.updateStatus(InstanceStatus.Connecting);

        this.actions = new ActionFactory(this);

        this.updateActions(); // export actions
        this.updateFeedbacks(); // export feedbacks
        this.updateVariableDefinitions(); // export variable definitions

        startDiscovery(config, this, (client) => {
            this.UmbraClient = client;
        });

        return Promise.resolve();
    }

    async destroy(): Promise<void> {
        this.log("debug", "destroy");
        this.UmbraClient?.destroy();
        return Promise.resolve();
    }

    async configUpdated(config: Config): Promise<void> {
        this.config = config;
        return Promise.resolve();
    }

    getConfigFields() {
        return configFields();
    }

    updateActions() {
        this.actions?.updateActions();
    }

    updateFeedbacks() {
        UpdateFeedbacks(this);
    }

    updateVariableDefinitions() {
        UpdateVariables(this);
    }
}

runEntrypoint(DMXCModuleInstance, UpgradeScripts());
