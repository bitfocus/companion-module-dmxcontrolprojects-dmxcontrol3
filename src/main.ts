import { InstanceBase, Regex, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades'
import { Config, configFields } from './config'
import { UpdateActions } from './actions'
import { UpdateFeedbacks } from './feedbacks'
import { UpdateVariables } from './variables'
import * as GRPC from '@grpc/grpc-js'
import { GRPCClient } from './grpc-client'

import dgram from 'dgram';
import { UmbraUdpBroadcast } from './generated/Common/Types/UmbraServiceTypes_pb'

export class ModuleInstance extends InstanceBase<Config> {
	public config?: Config;

	public UmbraClient?: GRPCClient;

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: Config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions

		const client = dgram.createSocket('udp4');

		client.on('error', (err) => {
			console.log(`UDP client error:\n${err.stack}`);
			client.close();
		});

		client.on('message', (msg, rinfo) => {
			const umbraUdpBroadcast = UmbraUdpBroadcast.deserializeBinary(msg);
			const clientInfo = umbraUdpBroadcast.getUmbraserver()?.getClientinfo();
			const netid = umbraUdpBroadcast.getUmbraserver()?.getClientinfo()?.getNetworkid();
			console.log(`UDP client got message from ${rinfo.address}:${rinfo.port}: ${clientInfo?.getHostname()}:${clientInfo?.getClientname()}:${clientInfo?.getNetworkid()}`);
			if (this.config?.netid && netid === this.config?.netid) {
				this.UmbraClient = new GRPCClient(rinfo.address, umbraUdpBroadcast.getUmbraserver()?.getClientinfo()?.getUmbraport() || this.config.port, this.config?.devicename);
				this.UmbraClient.login(this.config?.netid);
				client.close();
			}
		});

		client.bind(17474);
	}

	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config: Config) {
		this.config = config
	}

	getConfigFields() {
		return configFields()
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariables(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts())
