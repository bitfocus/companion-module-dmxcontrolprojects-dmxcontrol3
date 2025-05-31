import * as GRPC from "@grpc/grpc-js";
import * as OS from "os";

import { DMXCModuleInstance } from "../main";
import {
    CompanionActionDefinitions,
    CompanionFeedbackDefinitions,
    CompanionPresetDefinitions,
    InstanceStatus
} from "@companion-module/base";
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
import { UserContextRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.User";
import { UserClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import { IDMXCClient } from "./idmxcclient";

export class GRPCClient {
    private umbraClient: ClientServiceClient;
    private clientProgramInfo: ClientProgramInfo;
    private connectedClient?: ConnectedClientServiceClient;
    private endpoint: string;

    private metadata?: GRPC.Metadata;

    private interval?: NodeJS.Timeout;

    private clients: IDMXCClient[];

    constructor(
        host: string,
        port: number,
        deviceName: string,
        private instance: DMXCModuleInstance
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

        this.clients = [];

        this.instance = instance;
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
        requestid: string,
        callback: (response: InformClientExistsResponse) => void
    ) {
        const client = new DMXCNetServiceClient(
            `${host}:${port}`,
            GRPC.credentials.createInsecure()
        );
        client.informClientExists(
            InformClientExistsRequest.create({
                requestId: requestid,
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
                        this.instance.log(
                            "debug",
                            response.message?.formatString ?? ""
                        );
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
                        requestId: this.instance.getRequestId(),
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
                            this.clients.push(
                                new ExecutorClient(
                                    this.endpoint,
                                    this.metadata,
                                    instance
                                )
                            );
                            this.clients.push(
                                new MacroClient(
                                    this.endpoint,
                                    this.metadata,
                                    instance
                                )
                            );

                            const actions: CompanionActionDefinitions = {};
                            for (const a of this.clients.map((c) =>
                                c.generateActions()
                            )) {
                                for (const key in a) {
                                    actions[key] = a[key];
                                }
                            }
                            this.instance.setActionDefinitions(actions);

                            const feedbacks: CompanionFeedbackDefinitions = {};
                            for (const f of this.clients.map((c) =>
                                c.generateFeedbacks()
                            )) {
                                for (const key in f) {
                                    feedbacks[key] = f[key];
                                }
                            }

                            this.instance.log(
                                "debug",
                                `Set feedbacks: ${JSON.stringify(feedbacks)}`
                            );

                            this.instance.setFeedbackDefinitions(feedbacks);

                            this.instance.setVariableDefinitions(
                                this.clients
                                    .map((c) => c.generateVariables())
                                    .flat()
                            );

                            this.clients.forEach((client) => {
                                client.startClient(() => {
                                    this.updatePresets();
                                });
                            });
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

    updatePresets() {
        const presets: CompanionPresetDefinitions = {};
        for (const p of this.clients.map((c) => c.generatePresets())) {
            for (const key in p) {
                presets[key] = p[key];
            }
        }
        this.instance.setPresetDefinitions({});
        this.instance.setPresetDefinitions(presets);
    }

    public getMetadata(): GRPC.Metadata | undefined {
        return this.metadata;
    }

    public destroy(instance: DMXCModuleInstance, after: () => void): void {
        this.connectedClient?.close();
        this.clients.forEach((val, _) => {
            val.close();
        });
        clearInterval(this.interval);
        this.umbraClient.logoff(
            UmbraLogoffRequest.create({
                client: this.clientProgramInfo,
                sessionId: this.metadata?.get("SessionID")[0].toString()
            }),
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
