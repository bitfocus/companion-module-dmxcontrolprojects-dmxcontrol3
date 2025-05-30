import * as GRPC from "@grpc/grpc-js";
import * as OS from "os";

import { DMXCModuleInstance } from "../main";
import { InstanceStatus } from "@companion-module/base";
import { hashPasswordDMXC } from "../utils";
import { MacroClient } from "./macroclient";
import { ExecutorClient } from "./executorclient";
import {
    ClientServiceClient,
    ConnectedClientServiceClient,
    DMXCNetServiceClient
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufCommon";
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
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import { SetExecutorValuesRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";
import {
    MacroSetFaderStateRequest,
    MacroSetButtonStateRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Macro";
import { UserContextRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.User";
import { UserClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";

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

    private instance: DMXCModuleInstance;

    private requestid = 0;

    constructor(
        host: string,
        port: number,
        deviceName: string,
        instance: DMXCModuleInstance
    ) {
        this.endpoint = `${host}:${port}`;

        this.umbraClient = new ClientServiceClient(
            `${host}:${port}`,
            GRPC.credentials.createInsecure()
        );

        this.clientProgramInfo = GRPCClient.getClientProgramInfo(
            deviceName,
            instance.runtimeid
        );

        this.clients = new Map<DMXCClientKey, DMXCClient>();

        this.instance = instance;
    }

    public getRequestId(): number {
        return this.requestid++;
    }

    public static getClientProgramInfo(
        deviceName: string,
        runtimeid: string,
        timestamp: number = new Date().valueOf()
    ): ClientProgramInfo {
        const clientProgramInfo = ClientProgramInfo.create();

        const programInfo = ProgramInfo.create();
        programInfo.programmName = deviceName;
        programInfo.programVersion = "1.0.0";
        programInfo.vendor = "DMXControl Projects e.V.";
        programInfo.buildDate = new Date().valueOf();

        const ips = [];

        for (const [_, interfaces] of Object.entries(OS.networkInterfaces())) {
            if (!interfaces) continue;
            for (const inter of interfaces) {
                if (!inter.internal) ips.push(inter.address);
            }
        }

        const clientInfo = ClientInfo.create();
        clientInfo.hostname = OS.hostname();
        clientInfo.ips = ips;
        clientInfo.type = EClientType.ExternalTool;
        clientInfo.clientname = deviceName;
        clientInfo.clientCapabilities = 0;
        clientInfo.runtimeid = runtimeid;

        clientProgramInfo.clientInfo = clientInfo;
        clientProgramInfo.programInfo = programInfo;

        clientProgramInfo.clientTimestampUTC = timestamp;

        return clientProgramInfo;
    }

    public static clientExists(
        host: string,
        port: number,
        devicename: string,
        runtimeid: string,
        callback: (response: InformClientExistsResponse) => void
    ) {
        const client = new DMXCNetServiceClient(
            `${host}:${port}`,
            GRPC.credentials.createInsecure()
        );
        client.informClientExists(
            InformClientExistsRequest.create({
                info: this.getClientProgramInfo(devicename, runtimeid)
            }),
            (error, response) => {
                if (error) {
                    console.error(error);
                    return;
                }
                callback(response);
                client.close();
            }
        );
    }

    public login(
        netid: string,
        instance: DMXCModuleInstance,
        onClose: () => void,
        onError: () => void
    ) {
        if (this.clientProgramInfo.clientInfo) {
            this.clientProgramInfo.clientInfo.networkid = netid;
            this.clientProgramInfo.clientTimestampUTC = new Date().valueOf();
        }
        this.umbraClient.login(
            UmbraLoginRequest.create({ client: this.clientProgramInfo }),
            (error, response) => {
                if (error) {
                    onError();
                    return;
                }
                this.metadata = new GRPC.Metadata();
                this.metadata.add("SessionID", response.sessionId);
                this.connectedClient = new ConnectedClientServiceClient(
                    this.endpoint,
                    GRPC.credentials.createInsecure()
                );
                this.connectedClient.reportReadyToWork(
                    UmbraClientReadyToWorkNotification.create({
                        state: ReadyToWorkState.create({ readyToWork: true })
                    }),
                    this.metadata,
                    (error, response) => {
                        if (error) {
                            onError();
                            return;
                        }
                        if (response.ok)
                            instance.updateStatus(InstanceStatus.Ok);
                    }
                );
                const stream = this.connectedClient.ping(this.metadata);
                stream.on("error", (err) => {
                    instance.log("error", err.message);
                    onError();
                });
                stream.on("data", (data: PingPong) => {
                    instance.log(
                        "debug",
                        `${data.clientname}: ${data.responder}`
                    );
                });
                stream.on("end", () => {
                    instance.log("debug", "stream end");
                    onClose();
                });
                this.interval = setInterval(
                    () => stream.write(PingPong.create()),
                    10000
                );

                new UserClientClient(
                    this.endpoint,
                    GRPC.credentials.createInsecure()
                ).bind(
                    UserContextRequest.create({
                        username: instance.config?.username ?? "DMXCDefault",
                        passwordHash: hashPasswordDMXC(
                            instance.config?.password ?? "DMXC3"
                        )
                    }),
                    this.metadata,
                    (error, _) => {
                        if (error) {
                            instance.log("error", error.message);
                            onError();
                            return;
                        }
                        if (!this.metadata) {
                            instance.log("error", "Metadata not set");
                            return;
                        }
                        try {
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
                        } catch {
                            instance.log(
                                "error",
                                "Something died while retrieving changes!"
                            );
                            onError();
                        }
                    }
                );
            }
        );
    }

    public sendFaderState(
        request: MacroSetFaderStateRequest | SetExecutorValuesRequest
    ) {
        request.requestId = this.getRequestId().toString();
        if ("macroId" in request) {
            request.macroId =
                this.instance.repositories
                    ?.get("MacroRepository")
                    ?.getSingle(request.macroId)?.ID ?? request.macroId;
            const client = this.clients.get("Macro") as MacroClient;
            client.sendFaderState(request as MacroSetFaderStateRequest);
        }
        if ("executorId" in request) {
            request.executorId =
                this.instance.repositories
                    ?.get("ExecutorRepository")
                    ?.getSingle(request.executorId)?.ID ?? request.executorId;
            const client = this.clients.get("Executor") as ExecutorClient;
            client.sendExecutorState(request as SetExecutorValuesRequest);
        }
    }

    public sendButtonState(
        request: MacroSetButtonStateRequest | SetExecutorValuesRequest
    ) {
        request.requestId = this.getRequestId().toString();
        if ("macroId" in request) {
            request.macroId =
                this.instance.repositories
                    ?.get("MacroRepository")
                    ?.getSingle(request.macroId)?.ID ?? request.macroId;
            const client = this.clients.get("Macro") as MacroClient;
            client.sendButtonState(request as MacroSetButtonStateRequest);
        }
        if ("executorId" in request) {
            request.executorId =
                this.instance.repositories
                    ?.get("MacroRepository")
                    ?.getSingle(request.executorId)?.ID ?? request.executorId;
            const client = this.clients.get("Executor") as ExecutorClient;
            client.sendExecutorState(request as SetExecutorValuesRequest);
        }
    }

    public getMetadata(): GRPC.Metadata | undefined {
        return this.metadata;
    }

    public destroy(instance: DMXCModuleInstance, after: () => void): void {
        this.connectedClient?.close();
        clearInterval(this.interval);
        this.umbraClient.logoff(
            UmbraLogoffRequest.create({ client: this.clientProgramInfo }),
            (error, response) => {
                if (error) {
                    instance.log("error", error.message);
                    return;
                }
                instance.log("debug", response.bye);
                this.umbraClient.close();
                after();
            }
        );
    }
}
