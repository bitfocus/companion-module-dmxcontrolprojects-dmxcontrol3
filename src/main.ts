import { InstanceBase, Regex, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades'
import { Config, configFields } from './config'
import { UpdateActions } from './actions'
import { UpdateFeedbacks } from './feedbacks'
import { setVariableDefinitions } from './variables'

export class ModuleInstance extends InstanceBase<Config> {
	public config?: Config

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: Config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
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
		this.setActionDefinitions(UpdateActions(this));
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		setVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts())
