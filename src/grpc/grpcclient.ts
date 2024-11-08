import * as GRPC from "@grpc/grpc-js";
import * as OS from "os";

import {
    ClientServiceClient,
    ConnectedClientServiceClient
} from "../generated/Common/UmbraClientService_grpc_pb";
import {
    ClientInfo,
    ClientProgramInfo,
    EClientType,
    InformClientExistsRequest,
    InformClientExistsResponse,
    PingPong,
    ProgramInfo,
    ReadyToWorkState,
    UmbraClientReadyToWorkNotification,
    UmbraLoginRequest,
    UmbraLogoffRequest
} from "../generated/Common/Types/UmbraServiceTypes_pb";
import { DMXCModuleInstance } from "../main";
import { InstanceStatus } from "@companion-module/base";
import { DMXCNetServiceClient } from "../generated/Common/UmbraClientService_grpc_pb";
import { UserClientClient } from "../generated/Client/UserClient_grpc_pb";
import { UserContextRequest } from "../generated/Common/Types/User/UserServiceTypes_pb";
import { hashPasswordDMXC, loggedMethod } from "../utils";
import {
    MacroSetButtonStateRequest,
    MacroSetFaderStateRequest
} from "../generated/Common/Types/Macro/MacroServiceCRUDTypes_pb";
import { MacroClient } from "./macroclient";
import { SetExecutorValuesRequest } from "../generated/Common/Types/Executor/ExecutorServiceCRUDTypes_pb";
import { ExecutorClient } from "./executorclient";

type DMXCClient = MacroClient | ExecutorClient;

type DMXCClientKey = "Macro" | "Executor";

export class GRPCClient {
    private umbraClient: ClientServiceClient;
    private clientProgramInfo: ClientProgramInfo;
    private connectedClient?: ConnectedClientServiceClient;
    private endpoint: string;

    private metadata?: GRPC.Metadata;

    private interval?: NodeJS.Timeout;

    private clients: Map<DMXCClientKey, DMXCClient>;

    private requestid = 0;

    constructor(host: string, port: number, deviceName: string) {
        this.endpoint = `${host}:${port}`;

        this.umbraClient = new ClientServiceClient(
            `${host}:${port}`,
            GRPC.credentials.createInsecure()
        );

        this.clientProgramInfo = GRPCClient.getClientProgramInfo(deviceName);

        this.clients = new Map<DMXCClientKey, DMXCClient>();
    }

    public getRequestId(): number {
        return this.requestid++;
    }

    public static getClientProgramInfo(deviceName: string): ClientProgramInfo {
        const clientProgramInfo = new ClientProgramInfo();

        const programInfo = new ProgramInfo();
        programInfo.setProgrammname(deviceName);
        programInfo.setProgramversion("1.0.0");
        programInfo.setVendor("DMXControl Projects e.V.");
        programInfo.setBuilddate(new Date().valueOf());

        const ips = [];

        for (const [_, interfaces] of Object.entries(OS.networkInterfaces())) {
            if (!interfaces) continue;
            for (const inter of interfaces) {
                if (!inter.internal) ips.push(inter.address);
            }
        }

        const clientInfo = new ClientInfo();
        clientInfo.setHostname(OS.hostname());
        clientInfo.setIpsList(ips);
        clientInfo.setType(EClientType.EXTERNALTOOL);
        clientInfo.setClientname(deviceName);
        clientInfo.setClientcapabilities(0);

        return clientProgramInfo
            .setClientinfo(clientInfo)
            .setPrograminfo(programInfo);
    }

    public static clientExists(
        host: string,
        port: number,
        devicename: string,
        callback: (response: InformClientExistsResponse) => void
    ) {
        const client = new DMXCNetServiceClient(
            `${host}:${port}`,
            GRPC.credentials.createInsecure()
        );
        client.informClientExists(
            new InformClientExistsRequest().setInfo(
                this.getClientProgramInfo(devicename)
            ),
            loggedMethod((response) => {
                callback(response);
                client.close();
            })
        );
    }

    public login(netid: string, instance: DMXCModuleInstance) {
        this.clientProgramInfo.getClientinfo()?.setNetworkid(netid);
        this.umbraClient.login(
            new UmbraLoginRequest().setClient(this.clientProgramInfo),
            loggedMethod((response) => {
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
                    loggedMethod((response) => {
                        if (response.getOk())
                            instance.updateStatus(InstanceStatus.Ok);
                    })
                );
                const stream = this.connectedClient.ping(this.metadata);
                stream.on("error", (err) => {
                    console.error(err);
                });
                stream.on("data", (data: PingPong) => {
                    console.debug(data.toObject());
                });
                stream.on("end", () => {
                    console.debug("stream end");
                });
                this.interval = setInterval(
                    () => stream.write(new PingPong()),
                    10000
                );

                new UserClientClient(
                    this.endpoint,
                    GRPC.credentials.createInsecure()
                ).bind(
                    new UserContextRequest()
                        .setUsername(instance.config?.username ?? "DMXCDefault")
                        .setPasswordhash(
                            hashPasswordDMXC(
                                instance.config?.password ?? "DMXC3"
                            )
                        ),
                    this.metadata,
                    loggedMethod((_) => {
                        if (!this.metadata) {
                            console.error("Metadata not set");
                            return;
                        }
                        this.clients.set(
                            "Macro",
                            new MacroClient(
                                this.endpoint,
                                this.metadata,
                                instance
                            )
                        );
                        this.clients.set(
                            "Executor",
                            new ExecutorClient(
                                this.endpoint,
                                this.metadata,
                                instance
                            )
                        );
                    })
                );
            })
        );
    }

    public sendFaderState(
        request: MacroSetFaderStateRequest | SetExecutorValuesRequest
    ) {
        request.setRequestid(this.getRequestId().toString());
        if ("macroid" in request.toObject()) {
            const client = this.clients.get("Macro") as MacroClient;
            client.sendFaderState(request as MacroSetFaderStateRequest);
        }
        if ("executorid" in request.toObject()) {
            const client = this.clients.get("Executor") as ExecutorClient;
            client.sendExecutorState(request as SetExecutorValuesRequest);
        }
    }

    public sendButtonState(
        request: MacroSetButtonStateRequest | SetExecutorValuesRequest
    ) {
        request.setRequestid(this.getRequestId().toString());
        if ("macroid" in request.toObject()) {
            const client = this.clients.get("Macro") as MacroClient;
            client.sendButtonState(request as MacroSetButtonStateRequest);
        }
        if ("executorid" in request.toObject()) {
            const client = this.clients.get("Executor") as ExecutorClient;
            client.sendExecutorState(request as SetExecutorValuesRequest);
        }
    }

    public getMetadata(): GRPC.Metadata | undefined {
        return this.metadata;
    }

    public destroy(): void {
        this.connectedClient?.close();
        clearInterval(this.interval);
        this.umbraClient.logoff(
            new UmbraLogoffRequest().setClient(this.clientProgramInfo),
            loggedMethod((response) => {
                console.log(response);
                this.umbraClient.close();
            })
        );
    }
}
