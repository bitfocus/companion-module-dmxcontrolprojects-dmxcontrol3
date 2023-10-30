import { createHash } from 'crypto';
import { Config } from './config';
import { DMXCModuleInstance } from './main';

import dgram from "dgram";
import { UmbraUdpBroadcast } from "./generated/Common/Types/UmbraServiceTypes_pb";
import { GRPCClient } from './grpc-client';

export function hashPasswordDMXC(password: string): string {
    let hash = createHash("sha256");
    let start: string | Buffer = password;
    for (let i = 0; i < 36; i++) {
        start = hash.update(start).digest();
        hash = createHash("sha256");
    }
    return hash.update(start).digest("base64");
}

export function loggedMethod<t>(original: (r: t) => void) {
    return (e: Error|null, r: t) => {
        if (e) {
            console.error(e);
            return;
        }
        original(r);
    };
}

export function startDiscovery(config: Config, instance: DMXCModuleInstance, success: (client: GRPCClient) => void): void {
    const client = dgram.createSocket("udp4");

    let umbraClient;

    client.on("error", (err) => {
        console.log(`UDP client error:\n${err.stack}`);
        client.close();
    });

    client.on("message", (msg, rinfo) => {
        const umbraUdpBroadcast = UmbraUdpBroadcast.deserializeBinary(msg);
        const clientInfo = umbraUdpBroadcast
            .getUmbraserver()
            ?.getClientinfo();
        const netid = umbraUdpBroadcast
            .getUmbraserver()
            ?.getClientinfo()
            ?.getNetworkid();
        console.log(
            `UDP client got message from ${rinfo.address}:${
                rinfo.port
            }: ${clientInfo?.getHostname()}:${clientInfo?.getClientname()}:${clientInfo?.getNetworkid()}`
        );
        if (netid === config.netid) {
            umbraClient = new GRPCClient(
                rinfo.address,
                umbraUdpBroadcast
                    .getUmbraserver()
                    ?.getClientinfo()
                    ?.getUmbraport() ?? config.port,
                config.devicename
            );
            umbraClient.login(config.netid, instance);
            client.close();
            success(umbraClient);
        } else {
            const port =
                umbraUdpBroadcast
                    .getUmbraserver()
                    ?.getClientinfo()
                    ?.getUmbraport() ?? 17475;
            GRPCClient.clientExists(
                rinfo.address,
                port,
                config.devicename,
                (response) => {
                    response.getRequestsList().forEach((request) => {
                        if (request.hasTargetnetworkid()) {
                            config.netid =
                                request.getTargetnetworkid();
                        }
                        if (request.hasTargetclientname()) {
                            config.devicename =
                                request.getTargetclientname();
                        }
                    });
                }
            );
        }
    });

    client.bind(17474);
}