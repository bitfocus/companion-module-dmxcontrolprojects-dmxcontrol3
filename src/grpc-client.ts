import { UnaryCallback } from "@grpc/grpc-js/build/src/client";
import * as GRPC from '@grpc/grpc-js'
import * as OS from 'os'

import {ClientServiceClient, ConnectedClientServiceClient} from "./generated/Common/UmbraClientService_grpc_pb";
import { ClientInfo, ClientProgramInfo, EClientType, PingPong, ProgramInfo, UmbraLoginRequest, UmbraLoginResponse } from "./generated/Common/Types/UmbraServiceTypes_pb";

export class GRPCClient {
    private umbraClient: ClientServiceClient
    private clientProgramInfo: ClientProgramInfo
    private connectedClient: ConnectedClientServiceClient


    constructor(host: string, port: number, deviceName: string) {
        this.umbraClient = new ClientServiceClient(`${host}:${port}`, GRPC.credentials.createInsecure())

        const programInfo = new ProgramInfo();
        programInfo.setProgrammname(deviceName);
        programInfo.setProgramversion('1.0.0');
        programInfo.setVendor('DMXControl Projects e.V.');
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
        this.connectedClient = new ConnectedClientServiceClient(`${host}:${port}`, GRPC.credentials.createInsecure());
        const stream = this.connectedClient.ping();
        stream.on('data', (data: PingPong) => {
            console.log(data)
            stream.write(data);
        });
    }

    login(netid: string, callback: UnaryCallback<UmbraLoginResponse>) {
        this.clientProgramInfo.getClientinfo()?.setNetworkid(netid);
        this.umbraClient.login(new UmbraLoginRequest().setClient(this.clientProgramInfo), callback);
    }
}