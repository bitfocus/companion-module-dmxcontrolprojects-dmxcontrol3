import { Regex, SomeCompanionConfigField } from "@companion-module/base";

export interface Config {
    host: string;
    port: number;
    netid: string;
    devicename: string;
    username: string;
    password: string;
}

export const configFields = (): SomeCompanionConfigField[] => {
    return [
        {
            type: "textinput",
            id: "netid",
            label: "Net ID",
            width: 6,
            default: ""
        },
        {
            type: "textinput",
            id: "devicename",
            label: "Device Name",
            width: 6,
            default: "Companion"
        },
        {
            type: "static-text",
            id: "info",
            label: "Info",
            width: 8,
            value: "The Target IP and Port are only used if the discovery process wasn't successful."
        },
        {
            type: "checkbox",
            id: "disable_discovery",
            label: "Disable Autodiscovery",
            default: false,
            width: 4
        },
        {
            type: "textinput",
            id: "host",
            label: "Target IP",
            width: 8,
            default: "127.0.0.1",
            regex: Regex.IP
        },
        {
            type: "number",
            id: "port",
            label: "Target Port",
            width: 4,
            min: 1,
            max: 65535,
            default: 17475
        },
        {
            type: "static-text",
            id: "info",
            label: "Info",
            width: 12,
            value: "The username and password should not be changed unless instructed and only present for compatibility with future releases."
        },
        {
            type: "textinput",
            id: "username",
            label: "Username",
            width: 6,
            default: "DMXCDefault"
        },
        {
            type: "textinput",
            id: "password",
            label: "Password",
            width: 6,
            default: "DMXC3"
        }
    ];
};
