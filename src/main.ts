import {
    InstanceBase,
    runEntrypoint,
    InstanceStatus
} from "@companion-module/base";
import { UpgradeScripts } from "./upgrades";
import { Config, configFields } from "./config";
import { GRPCClient } from "./grpc/grpcclient";
import { startDiscovery } from "./utils";
import { randomUUID } from "crypto";
import dgram from "dgram";

export class DMXCModuleInstance extends InstanceBase<Config> {
    public config?: Config;

    public UmbraClient?: GRPCClient;

    public runtimeid = "";

    public socket: dgram.Socket | undefined;

    private request_id_prefix = "WonWon";

    private request_id_num = 0;

    async init(config: Config) {
        this.config = config;

        this.runtimeid = randomUUID().toString();

        this.request_id_prefix += `-${randomUUID()}`;

        this.updateStatus(InstanceStatus.Connecting);

        if (config.disablediscovery) {
            this.UmbraClient = new GRPCClient(
                config.host,
                config.port,
                config.devicename,
                this
            );
            this.UmbraClient.login(
                config.netid,
                this,
                () => {
                    this.updateStatus(InstanceStatus.Disconnected);
                },
                () => {
                    this.updateStatus(InstanceStatus.ConnectionFailure);
                }
            );
        } else {
            this.socket = startDiscovery(
                config,
                this,
                (client, config) => {
                    this.UmbraClient = client;
                    this.saveConfig(config);
                },
                () => {
                    this.errorhandler();
                }
            );
        }

        return Promise.resolve();
    }

    errorhandler(): void {
        this.updateStatus(InstanceStatus.Disconnected);
        if (this.UmbraClient) {
            this.UmbraClient.destroy(this, () => {
                if (this.config) {
                    this.socket = startDiscovery(
                        this.config,
                        this,
                        (client) => {
                            this.UmbraClient = client;
                        },
                        () => {
                            this.errorhandler();
                        }
                    );
                }
            });
        }
    }

    async destroy(): Promise<void> {
        this.log("debug", "destroy");
        return new Promise((resolve, _) => {
            this.UmbraClient?.destroy(this, () => {
                resolve();
            });
        });
    }

    async configUpdated(config: Config): Promise<void> {
        if (this.config?.netid && this.config.netid !== config.netid) {
            this.log(
                "debug",
                `netid changed from ${this.config.netid} to ${config.netid}`
            );
            if (this.socket) {
                this.log(
                    "debug",
                    `closing socket ${this.socket.address().address}:${this.socket.address().port}`
                );
                this.socket.close();
                this.socket = undefined;
            }
        }
        this.log("debug", `configUpdated: ${JSON.stringify(config, null, 2)}`);
        this.config = config;
        return Promise.resolve();
    }

    getRequestId(): string {
        return `${this.request_id_prefix}-${this.request_id_num++}`;
    }

    getConfigFields() {
        return configFields();
    }
}

runEntrypoint(DMXCModuleInstance, UpgradeScripts());
