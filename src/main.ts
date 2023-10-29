import { InstanceBase, Regex, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades'
import { Config, configFields } from './config'
import { UpdateActions } from './actions'
import { UpdateFeedbacks } from './feedbacks'
import { UpdateVariables } from './variables'
import * as GRPC from '@grpc/grpc-js'
import { GRPCClient } from './grpc-client'

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
		this.UmbraClient = new GRPCClient(config.host, config.port, config.devicename)
		this.UmbraClient.login(config.netid, (err, res) => {
			if (err) {
				this.log('error', err.message);
			} if (!res){
				this.log('error', 'No response from server');
			}
			else {
				this.log('info', res.getMessage());
			}
		})
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
