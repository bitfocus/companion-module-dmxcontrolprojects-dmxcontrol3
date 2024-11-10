import { createHash } from "crypto";
import { Config } from "./config";
import { DMXCModuleInstance } from "./main";

import dgram from "dgram";
import { UmbraUdpBroadcast } from "./generated/Common/Types/UmbraServiceTypes_pb";
import { GRPCClient } from "./grpc/grpcclient";

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
    return (e: Error | null, r: t) => {
        if (e) {
            console.error(e);
            return;
        }
        original(r);
    };
}

export function startDiscovery(
    config: Config,
    instance: DMXCModuleInstance,
    success: (client: GRPCClient) => void,
    errorclose: () => void
): void {
    const client = dgram.createSocket({ type: "udp4", reuseAddr: true });

    let umbraClient;

    client.on("error", (err) => {
        instance.log("error", `UDP client error:\n${err.stack}`);
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
        if (netid === config.netid) {
            umbraClient = new GRPCClient(
                rinfo.address,
                umbraUdpBroadcast
                    .getUmbraserver()
                    ?.getClientinfo()
                    ?.getUmbraport() ?? config.port,
                config.devicename
            );
            umbraClient.login(config.netid, instance, errorclose, errorclose);
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
                            config.netid = request.getTargetnetworkid();
                        }
                        if (request.hasTargetclientname()) {
                            config.devicename = request.getTargetclientname();
                        }
                    });
                }
            );
        }
    });

    client.bind({ address: "0.0.0.0", port: 17474, exclusive: false }, () => {
        client.addMembership("225.68.67.3");
    });
}
