import { createHash } from "crypto";
import { Config } from "./config";
import { DMXCModuleInstance } from "./main";

import dgram from "dgram";
import { GRPCClient } from "./grpc/grpcclient";
import { UmbraUdpBroadcast } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";

export function hashPasswordDMXC(password: string): string {
    let hash = createHash("sha256");
    let start: string | Buffer = password;
    for (let i = 0; i < 36; i++) {
        start = hash.update(start).digest();
        hash = createHash("sha256");
    }
    return hash.update(start).digest("base64");
}

export function loggedMethod<T>(original: (r: T) => void) {
    return (e: Error | null, r: T) => {
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
    success: (client: GRPCClient, config: Config) => void,
    errorclose: () => void
): dgram.Socket {
    const client = dgram.createSocket({ type: "udp4", reuseAddr: true });

    let umbraClient;

    client.on("error", (err) => {
        instance.log("error", `UDP client error:\n${err.stack}`);
        client.close();
    });

    client.on("message", (msg, rinfo) => {
        const umbraUdpBroadcast = UmbraUdpBroadcast.decode(msg);
        const clientInfo = umbraUdpBroadcast.umbraServer?.clientInfo;
        const netid = umbraUdpBroadcast.umbraServer?.clientInfo?.networkid;
        instance.log(
            "debug",
            `UDP client got message from ${rinfo.address}:${rinfo.port}: ${clientInfo?.hostname}:${clientInfo?.clientname}:${clientInfo?.networkid}`
        );
        if (netid === config.netid) {
            umbraClient = new GRPCClient(
                rinfo.address,
                umbraUdpBroadcast.umbraServer?.clientInfo?.umbraPort ??
                    config.port,
                config.devicename,
                instance
            );
            umbraClient.login(config.netid, instance, errorclose, errorclose);
            client.close();
            success(umbraClient, config);
        } else {
            const port =
                umbraUdpBroadcast.umbraServer?.clientInfo?.umbraPort ?? 17475;
            GRPCClient.clientExists(
                rinfo.address,
                port,
                config.devicename,
                instance.runtimeid,
                (response) => {
                    response.requests.forEach((request) => {
                        if (request.targetNetworkId) {
                            config.netid = request.targetNetworkId;
                        }
                        if (request.targetClientName) {
                            config.devicename = request.targetClientName;
                        }
                    });
                }
            );
        }
    });

    client.bind({ address: "0.0.0.0", port: 17474, exclusive: false }, () => {
        client.addMembership("225.68.67.3");
    });

    return client;
}
