import {
  InstanceBase,
  runEntrypoint,
  InstanceStatus
} from "@companion-module/base";
import { UpgradeScripts } from "./upgrades";
import { Config, configFields } from "./config";
import { UpdateActions } from "./actions";
import { UpdateFeedbacks } from "./feedbacks";
import { UpdateVariables } from "./variables";
import { GRPCClient } from "./grpc-client";

import dgram from "dgram";
import { UmbraUdpBroadcast } from "./generated/Common/Types/UmbraServiceTypes_pb";

export class ModuleInstance extends InstanceBase<Config> {
  public config?: Config;

  public UmbraClient?: GRPCClient;

  async init(config: Config) {
    this.config = config;

    this.updateStatus(InstanceStatus.Connecting);

    this.updateActions(); // export actions
    this.updateFeedbacks(); // export feedbacks
    this.updateVariableDefinitions(); // export variable definitions

    const client = dgram.createSocket("udp4");

    client.on("error", (err) => {
      console.log(`UDP client error:\n${err.stack}`);
      client.close();
    });

    client.on("message", (msg, rinfo) => {
      const umbraUdpBroadcast = UmbraUdpBroadcast.deserializeBinary(msg);
      const clientInfo = umbraUdpBroadcast.getUmbraserver()?.getClientinfo();
      const netid = umbraUdpBroadcast
        .getUmbraserver()
        ?.getClientinfo()
        ?.getNetworkid();
      console.log(
        `UDP client got message from ${rinfo.address}:${
          rinfo.port
        }: ${clientInfo?.getHostname()}:${clientInfo?.getClientname()}:${clientInfo?.getNetworkid()}`
      );
      if (this.config?.netid && netid === this.config.netid) {
        this.UmbraClient = new GRPCClient(
          rinfo.address,
          umbraUdpBroadcast.getUmbraserver()?.getClientinfo()?.getUmbraport() ??
            this.config.port,
          this.config.devicename
        );
        this.UmbraClient.login(this.config.netid, this);
        client.close();
      }
    });

    client.bind(17474);

    return Promise.resolve();
  }

  async destroy(): Promise<void> {
    this.log("debug", "destroy");
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
    UpdateActions(this);
  }

  updateFeedbacks() {
    UpdateFeedbacks(this);
  }

  updateVariableDefinitions() {
    UpdateVariables(this);
  }
}

runEntrypoint(ModuleInstance, UpgradeScripts());
