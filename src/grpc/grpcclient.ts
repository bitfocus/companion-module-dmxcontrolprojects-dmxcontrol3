import * as GRPC from '@grpc/grpc-js'
import * as OS from 'os'

import { DMXCModuleInstance } from '../main.js'
import {
	type CompanionActionDefinitions,
	type CompanionFeedbackDefinitions,
	type CompanionPresetDefinitions,
	InstanceStatus,
} from '@companion-module/base'
import { callOpts, hashPasswordDMXC } from '../utils.js'
import { MacroClient } from './macroclient.js'
import { ExecutorClient } from './executorclient.js'
import {
	ClientServiceClient,
	ConnectedClientServiceClient,
	DMXCNetServiceClient,
} from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobufCommon'
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
	UmbraLogoffRequest,
} from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobuf'
import { UserContextRequest } from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobuf.User'
import { UserClientClient } from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobufClient'
import type { HealthReporter, IDMXCClient } from './idmxcclient.js'
import { CuelistClient } from './cuelistclient.js'

export class GRPCClient {
	private umbraClient: ClientServiceClient
	private clientProgramInfo: ClientProgramInfo
	private connectedClient?: ConnectedClientServiceClient
	private endpoint: string

	private metadata?: GRPC.Metadata

	private interval?: NodeJS.Timeout

	private clients: IDMXCClient[]
	private userclient?: UserClientClient

	/** True once login, ready-to-work and user bind succeeded */
	private connected = false
	private destroyed = false
	/** Components that reported a partial failure, mapped to their message */
	private degradedComponents = new Map<string, string>()

	private health: HealthReporter = {
		degraded: (component, message) => {
			if (this.destroyed) return
			this.degradedComponents.set(component, message)
			this.refreshStatus()
		},
		recovered: (component) => {
			if (this.destroyed || !this.degradedComponents.delete(component)) return
			this.refreshStatus()
		},
	}

	constructor(
		host: string,
		port: number,
		deviceName: string,
		private instance: DMXCModuleInstance,
	) {
		this.endpoint = `${host}:${port}`

		this.umbraClient = new ClientServiceClient(`${host}:${port}`, GRPC.credentials.createInsecure())

		this.clientProgramInfo = GRPCClient.getClientProgramInfo(deviceName, instance.runtimeid)

		this.clients = []

		this.instance = instance
	}

	public static getClientProgramInfo(
		deviceName: string,
		runtimeid: string,
		timestamp: number = new Date().valueOf(),
	): ClientProgramInfo {
		const clientProgramInfo = ClientProgramInfo.create()

		const programInfo = ProgramInfo.create()
		programInfo.programName = deviceName
		programInfo.programVersion = '1.0.0'
		programInfo.vendor = 'DMXControl Projects e.V.'
		programInfo.buildDate = new Date().valueOf()

		const ips = []

		for (const interfaces of Object.values(OS.networkInterfaces())) {
			if (!interfaces) continue
			for (const inter of interfaces) {
				if (!inter.internal) ips.push(inter.address)
			}
		}

		const clientInfo = ClientInfo.create()
		clientInfo.hostname = OS.hostname()
		clientInfo.ips = ips
		clientInfo.type = EClientType.ExternalTool
		clientInfo.clientname = deviceName
		clientInfo.clientCapabilities = 0
		clientInfo.runtimeid = runtimeid

		clientProgramInfo.clientInfo = clientInfo
		clientProgramInfo.programInfo = programInfo

		clientProgramInfo.clientTimestampUTC = timestamp

		return clientProgramInfo
	}

	public static clientExists(
		host: string,
		port: number,
		devicename: string,
		runtimeid: string,
		requestid: string,
		callback: (response: InformClientExistsResponse) => void,
	): void {
		const client = new DMXCNetServiceClient(`${host}:${port}`, GRPC.credentials.createInsecure())
		client.informClientExists(
			InformClientExistsRequest.create({
				requestId: requestid,
				info: this.getClientProgramInfo(devicename, runtimeid),
			}),
			new GRPC.Metadata(),
			callOpts(),
			(error, response) => {
				client.close()
				if (error) {
					console.error(error)
					return
				}
				callback(response)
			},
		)
	}

	/**
	 * Sets the instance status from the connection health: Ok when fully connected,
	 * UnknownWarning while any component reported a partial failure.
	 */
	private refreshStatus(): void {
		if (this.destroyed || !this.connected) return
		if (this.degradedComponents.size > 0) {
			this.instance.updateStatus(InstanceStatus.UnknownWarning, [...this.degradedComponents.values()].join('; '))
		} else {
			this.instance.updateStatus(InstanceStatus.Ok)
		}
	}

	public login(
		netid: string,
		instance: DMXCModuleInstance,
		onClose: (message: string) => void,
		onError: (message: string) => void,
	): void {
		// Ignore failures caused by our own teardown (closing clients cancels their calls and streams)
		const fail = (message: string) => {
			if (this.destroyed) return
			this.connected = false
			instance.log('error', message)
			onError(message)
		}
		const closed = (message: string) => {
			if (this.destroyed) return
			this.connected = false
			instance.log('warn', message)
			onClose(message)
		}
		if (this.clientProgramInfo.clientInfo) {
			this.clientProgramInfo.clientInfo.networkid = netid
			this.clientProgramInfo.clientTimestampUTC = new Date().valueOf()
		}
		this.umbraClient.login(
			UmbraLoginRequest.create({ client: this.clientProgramInfo }),
			new GRPC.Metadata(),
			callOpts(),
			(error, response) => {
				instance.log('debug', 'Sending login Request to Umbra')
				if (error) {
					fail('Login failed: ' + error.message)
					return
				}
				this.metadata = new GRPC.Metadata()
				this.metadata.add('SessionID', response.sessionId)
				this.connectedClient = new ConnectedClientServiceClient(this.endpoint, GRPC.credentials.createInsecure())
				this.connectedClient.reportReadyToWork(
					UmbraClientReadyToWorkNotification.create({
						state: ReadyToWorkState.create({ readyToWork: true }),
					}),
					this.metadata,
					callOpts(),
					(error, response) => {
						if (error) {
							fail('Report ready to work failed: ' + error.message)
							return
						}
						this.instance.log('debug', response.message?.formatString ?? '')
						if (response.ok) this.health.recovered('ready')
						else
							this.health.degraded(
								'ready',
								'Server did not accept ready to work: ' + (response.message?.formatString ?? ''),
							)
					},
				)
				const stream = this.connectedClient.ping(this.metadata)
				stream.on('error', (err: Error) => {
					fail('Connection lost (ping stream): ' + err.message)
				})
				stream.on('data', (data: PingPong) => {
					instance.log('debug', `${data.clientname}: ${data.responder}`)
				})
				stream.on('end', () => {
					closed('Connection closed by server')
				})
				this.interval = setInterval(() => stream.write(PingPong.create()), 10000)

				this.userclient = new UserClientClient(this.endpoint, GRPC.credentials.createInsecure())

				this.userclient.bind(
					UserContextRequest.create({
						requestId: this.instance.getRequestId(),
						username: instance.config?.username ?? 'DMXCDefault',
						passwordHash: hashPasswordDMXC(instance.config?.password ?? 'DMXC3'),
					}),
					this.metadata,
					callOpts(),
					(error, _) => {
						if (error) {
							fail('Binding user failed: ' + error.message)
							return
						}
						if (!this.metadata) {
							fail('Session metadata not set after login')
							return
						}

						try {
							this.clients.push(new ExecutorClient(this.endpoint, this.metadata, instance, this.health))
							this.clients.push(new MacroClient(this.endpoint, this.metadata, instance, this.health))
							this.clients.push(new CuelistClient(this.endpoint, this.metadata, instance, this.health))

							this.updateActions()
							this.updateFeedbacks()

							this.clients.forEach((client) => {
								void client.startClient(
									this.updatePresets.bind(this),
									this.updateActions.bind(this),
									this.updateFeedbacks.bind(this),
									this.updateVariables.bind(this),
								)
							})
							this.connected = true
							this.refreshStatus()
						} catch (err) {
							fail('Setting up clients failed: ' + (err as Error).message)
						}
					},
				)
			},
		)
	}

	updatePresets(): void {
		const presets: CompanionPresetDefinitions = {}
		for (const p of this.clients.map((c) => c.generatePresets())) {
			for (const key in p) {
				presets[key] = p[key]
			}
		}
		this.instance.setPresetDefinitions({})
		this.instance.setPresetDefinitions(presets)
	}

	updateActions(): void {
		const actions: CompanionActionDefinitions = {}
		for (const a of this.clients.map((c) => c.generateActions())) {
			for (const key in a) {
				actions[key] = a[key]
			}
		}
		this.instance.setActionDefinitions(actions)
	}

	updateFeedbacks(): void {
		const feedbacks: CompanionFeedbackDefinitions = {}
		for (const f of this.clients.map((c) => c.generateFeedbacks())) {
			for (const key in f) {
				feedbacks[key] = f[key]
			}
		}

		this.instance.log('debug', `Set feedbacks: ${JSON.stringify(feedbacks)}`)

		this.instance.setFeedbackDefinitions(feedbacks)
	}

	updateVariables(): void {
		this.instance.setVariableDefinitions(this.clients.map((c) => c.generateVariables()).flat())
	}

	public getMetadata(): GRPC.Metadata | undefined {
		return this.metadata
	}

	public destroy(instance: DMXCModuleInstance, after: () => void): void {
		this.destroyed = true
		this.connected = false
		this.connectedClient?.close()
		this.clients.forEach((val) => {
			val.close()
		})
		this.userclient?.close()
		clearInterval(this.interval)
		this.umbraClient.logoff(
			UmbraLogoffRequest.create({
				client: this.clientProgramInfo,
				// sessionId: this.metadata?.get('SessionID')[0].toString(),
			}),
			new GRPC.Metadata(),
			callOpts(),
			(error, response) => {
				// Always finish teardown: logoff usually fails exactly when we are tearing down because the server is gone
				if (error) instance.log('warn', 'While logging off: ' + error.message)
				else instance.log('debug', response.bye)
				this.umbraClient.close()
				after()
			},
		)
	}
}
