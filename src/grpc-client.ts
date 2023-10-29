import * as GRPC from "@grpc/grpc-js";
import * as OS from "os";

import {
  ClientServiceClient,
  ConnectedClientServiceClient
} from "./generated/Common/UmbraClientService_grpc_pb";
import {
  ClientInfo,
  ClientProgramInfo,
  EClientType,
  PingPong,
  ProgramInfo,
  ReadyToWorkState,
  UmbraClientReadyToWorkNotification,
  UmbraLoginRequest
} from "./generated/Common/Types/UmbraServiceTypes_pb";
import { ModuleInstance } from "./main";
import { InstanceStatus } from "@companion-module/base";

export class GRPCClient {
  private umbraClient: ClientServiceClient;
  private clientProgramInfo: ClientProgramInfo;
  private connectedClient?: ConnectedClientServiceClient;
  private endpoint: string;

  private metadata?: GRPC.Metadata;

  constructor(host: string, port: number, deviceName: string) {
    this.endpoint = `${host}:${port}`;

    this.umbraClient = new ClientServiceClient(
      `${host}:${port}`,
      GRPC.credentials.createInsecure()
    );

    const programInfo = new ProgramInfo();
    programInfo.setProgrammname(deviceName);
    programInfo.setProgramversion("1.0.0");
    programInfo.setVendor("DMXControl Projects e.V.");
    programInfo.setBuilddate(new Date().valueOf());

    const clientInfo = new ClientInfo();
    clientInfo.setHostname(OS.hostname());
    clientInfo.setIpsList([]);
    clientInfo.setType(EClientType.EXTERNALTOOL);
    clientInfo.setClientname(deviceName);
    clientInfo.setClientcapabilities(0);

    this.clientProgramInfo = new ClientProgramInfo();
    this.clientProgramInfo.setPrograminfo(programInfo);
    this.clientProgramInfo.setClientinfo(clientInfo);
  }

  login(netid: string, instance: ModuleInstance) {
    this.clientProgramInfo.getClientinfo()?.setNetworkid(netid);
    this.umbraClient.login(
      new UmbraLoginRequest().setClient(this.clientProgramInfo),
      (err, response) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(response);
        this.metadata = new GRPC.Metadata();
        this.metadata.add("SessionID", response.getSessionid());
        this.connectedClient = new ConnectedClientServiceClient(
          this.endpoint,
          GRPC.credentials.createInsecure()
        );
        this.connectedClient.reportReadyToWork(
          new UmbraClientReadyToWorkNotification().setState(
            new ReadyToWorkState().setReadytowork(true)
          ),
          this.metadata,
          (err, response) => {
            if (err) {
              console.error(err);
              return;
            }
            console.log(response);
            instance.updateStatus(InstanceStatus.Ok);
          }
        );
        const stream = this.connectedClient.ping(this.metadata);
        stream.on("error", (err) => {
          console.error(err);
        });
        stream.on("data", (data: PingPong) => {
          console.log(data);
        });
        stream.on("end", () => {
          console.log("stream end");
        });
        setInterval(() => stream.write(new PingPong()), 10000);
      }
    );
  }
}
