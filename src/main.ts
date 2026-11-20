import { InstanceBase, runEntrypoint, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { type Config, configFields } from './config.js'
import { GRPCClient } from './grpc/grpcclient.js'
import { closeSocket, startDiscovery } from './utils.js'
import { randomUUID } from 'crypto'
import dgram from 'dgram'

/** Delay before restarting discovery after a connection error, to avoid a tight loop while the server is down */
const RECONNECT_DELAY_MS = 2000

export class DMXCModuleInstance extends InstanceBase<Config> {
	public config?: Config

	public UmbraClient?: GRPCClient

	public runtimeid = ''

	public socket: dgram.Socket | undefined

	private request_id_prefix = 'WonWon'

	private request_id_num = 0

	/** Incremented for every new connection attempt so late error/close events from an old client are ignored */
	private connectionGeneration = 0

	private reconnecting = false

	private reconnectTimer?: NodeJS.Timeout

	private destroyed = false

	async init(config: Config): Promise<void> {
		this.config = config

		this.runtimeid = randomUUID()

		this.request_id_prefix += `-${randomUUID()}`

		this.updateStatus(InstanceStatus.Connecting)

		if (config.disablediscovery) {
			this.UmbraClient = new GRPCClient(config.host, config.port, config.devicename, this)
			this.UmbraClient.login(
				config.netid,
				this,
				() => {
					this.updateStatus(InstanceStatus.Disconnected)
				},
				() => {
					this.updateStatus(InstanceStatus.ConnectionFailure)
				},
			)
		} else {
			this.discover()
		}

		return Promise.resolve()
	}

	/**
	 * Starts a new discovery, closing any previous discovery socket first.
	 */
	private discover(): void {
		if (!this.config || this.destroyed) return
		closeSocket(this.socket)
		const generation = ++this.connectionGeneration
		this.socket = startDiscovery(
			this.config,
			this,
			(client, config) => {
				this.UmbraClient = client
				this.saveConfig(config)
			},
			() => {
				this.errorhandler(generation)
			},
		)
	}

	/**
	 * Tears down the current connection and restarts discovery after a short delay.
	 * Ignores calls from outdated connections and calls while a reconnect is already in progress,
	 * since one failure typically fires several callbacks (ping stream error + end, bind error, ...).
	 */
	errorhandler(generation: number): void {
		if (this.destroyed || this.reconnecting || generation !== this.connectionGeneration) return
		this.reconnecting = true
		this.updateStatus(InstanceStatus.Disconnected)

		const restart = () => {
			this.UmbraClient = undefined
			closeSocket(this.socket)
			this.socket = undefined
			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = undefined
				this.reconnecting = false
				this.discover()
			}, RECONNECT_DELAY_MS)
		}

		if (this.UmbraClient) this.UmbraClient.destroy(this, restart)
		else restart()
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.destroyed = true
		clearTimeout(this.reconnectTimer)
		closeSocket(this.socket)
		this.socket = undefined
		const client = this.UmbraClient
		this.UmbraClient = undefined
		if (!client) return
		await new Promise<void>((resolve) => client.destroy(this, resolve))
	}

	async configUpdated(config: Config): Promise<void> {
		if (this.config?.netid && this.config.netid !== config.netid) {
			this.log('debug', `netid changed from ${this.config.netid} to ${config.netid}`)
			if (this.socket) {
				this.log('debug', 'closing discovery socket')
				closeSocket(this.socket)
				this.socket = undefined
			}
		}
		this.log('debug', `configUpdated: ${JSON.stringify(config, null, 2)}`)
		this.config = config
		return Promise.resolve()
	}

	getRequestId(): string {
		return `${this.request_id_prefix}-${this.request_id_num++}`
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return configFields()
	}
}

runEntrypoint(DMXCModuleInstance, UpgradeScripts())
