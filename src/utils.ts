import { createHash } from 'crypto'
import type { Config } from './config.js'
import { DMXCModuleInstance } from './main.js'

import dgram from 'dgram'
import type { CallOptions } from '@grpc/grpc-js'
import { GRPCClient } from './grpc/grpcclient.js'
import { UmbraUdpBroadcast } from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobuf'
import {
	InstanceStatus,
	type CompanionInputFieldDropdown,
	type CompanionInputFieldNumber,
	type CompanionInputFieldTextInput,
	type CompanionOptionValues,
} from '@companion-module/base'

/** Default timeout for unary gRPC calls */
export const RPC_TIMEOUT_MS = 5000

/** Time to wait for a discovery broadcast with the configured NetID before reporting a failure */
export const DISCOVERY_TIMEOUT_MS = 15000

/**
 * Call options for unary gRPC calls, so a hung server makes the call fail with DEADLINE_EXCEEDED
 * instead of leaving it pending forever. Do not use for long-lived streams.
 */
export function callOpts(timeoutMs = RPC_TIMEOUT_MS): Partial<CallOptions> {
	return { deadline: Date.now() + timeoutMs }
}

export function hashPasswordDMXC(password: string): string {
	let hash = createHash('sha256')
	let start: string | Buffer = password
	for (let i = 0; i < 36; i++) {
		start = hash.update(start).digest()
		hash = createHash('sha256')
	}
	return hash.update(start).digest('base64')
}

export function startDiscovery(
	config: Config,
	instance: DMXCModuleInstance,
	success: (client: GRPCClient, config: Config) => void,
	errorclose: () => void,
): dgram.Socket {
	const client = dgram.createSocket({ type: 'udp4', reuseAddr: true })

	let umbraClient

	// Report a failure if no server with the configured NetID shows up. The socket stays open,
	// so the module still connects once the server appears.
	const discoveryTimeout = setTimeout(() => {
		instance.log('warn', `No DMXControl server with NetID "${config.netid}" found within ${DISCOVERY_TIMEOUT_MS} ms`)
		instance.updateStatus(InstanceStatus.ConnectionFailure, `No server with NetID "${config.netid}" found`)
	}, DISCOVERY_TIMEOUT_MS)

	client.on('close', () => {
		clearTimeout(discoveryTimeout)
	})

	client.on('error', (err) => {
		instance.log('error', `UDP client error:\n${err.stack}`)
		client.close()
	})

	client.on('message', (msg, rinfo) => {
		const umbraUdpBroadcast = UmbraUdpBroadcast.decode(msg)
		const clientInfo = umbraUdpBroadcast.umbraServer?.clientInfo
		const netid = umbraUdpBroadcast.umbraServer?.clientInfo?.networkid
		instance.log(
			'debug',
			`UDP client got message from ${rinfo.address}:${rinfo.port}: ${clientInfo?.hostname}:${clientInfo?.clientname}:${clientInfo?.networkid}`,
		)
		if (netid === config.netid) {
			clearTimeout(discoveryTimeout)
			instance.updateStatus(InstanceStatus.Connecting)
			umbraClient = new GRPCClient(
				rinfo.address,
				umbraUdpBroadcast.umbraServer?.clientInfo?.umbraPort ?? config.port,
				config.devicename,
				instance,
			)
			instance.log('debug', 'Login in to Umbra')
			umbraClient.login(config.netid, instance, errorclose, errorclose)
			client.close()
			success(umbraClient, config)
		} else {
			const port = umbraUdpBroadcast.umbraServer?.clientInfo?.umbraPort ?? 17475
			GRPCClient.clientExists(
				rinfo.address,
				port,
				config.devicename,
				instance.runtimeid,
				instance.getRequestId(),
				(response) => {
					response.requests.forEach((request) => {
						if (request.targetNetworkId) {
							config.netid = request.targetNetworkId
						}
						if (request.targetClientName) {
							config.devicename = request.targetClientName
						}
					})
				},
			)
		}
	})

	client.bind({ address: '0.0.0.0', port: 17474, exclusive: false }, () => {
		client.addMembership('225.68.67.3')
		instance.log('debug', 'Joined Multicast')
	})

	return client
}

enum NumberVariableFieldType {
	Number = 'number',
	TextVariables = 'textinput',
}

/**
 * Generates companion input fields to allow the user to enter a number or specify it using a (variable) expression
 *
 * @param label The label for the input field
 * @param min Minimum value the entered number may be (inclusive)
 * @param max Maximum value the entered number may be (inclusive)
 * @param defaultVal The value that should be preselected in the number input field
 * @param id (Optional) specify the id prefix used for the fields to allow fo multiple instances
 * @returns 3 Companion input fields (choice between number/text, conditional number input, conditional text/expression input)
 */
export function generateNumberOrVariableField(
	label: string,
	min: number,
	max: number,
	defaultVal: number,
	id = 'numeric',
): (CompanionInputFieldDropdown | CompanionInputFieldNumber | CompanionInputFieldTextInput)[] {
	return [
		{
			type: 'dropdown',
			label: `Type of ${label} field`,
			id: `${id}_type`,
			default: NumberVariableFieldType.Number,
			choices: [
				{ id: NumberVariableFieldType.Number, label: 'Number input' },
				{
					id: NumberVariableFieldType.TextVariables,
					label: 'Text/Variables',
				},
			],
		},
		{
			id: `${id}_number`,
			type: `number`,
			label,
			min: min,
			max: max,
			default: defaultVal,
			isVisibleExpression: `$(options:${id}_type) == "${NumberVariableFieldType.Number}"`,
		},
		{
			id: `${id}_text`,
			type: `textinput`,
			label: label + ' (with variables)',
			default: '',
			isVisibleExpression: `$(options:${id}_type) == "${NumberVariableFieldType.TextVariables}"`,
			useVariables: {
				local: true,
			},
		},
	]
}

/**
 * Retrieves the numeric value entered in the fields created with `generateNumberOrVariableField`
 *
 * @param min Minimum value the entered number may be (inclusive)
 * @param max Maximum value the entered number may be (inclusive)
 * @param options The (full, unmodified) `options` object returned in the event (e.g. in an action) by companion
 * @param parseVariablesInString The `parseVariablesInString` in the context (second param) passed to events (e.g. actions)
 * @param id (Optional) id prefix used when reating the fields (allows multiple instances)
 * @returns Promise resolving to the entered number
 * @throws Rejects promise if user input isn't a valid finite number within the specified range
 */
export async function checkAndGetNumberOrVariable(
	min: number,
	max: number,
	options: CompanionOptionValues,
	parseVariablesInString: (text: string) => Promise<string>,
	id = 'numeric',
): Promise<number> {
	const field_type = options[`${id}_type`] as string
	if (typeof field_type !== 'string') {
		throw new Error('A valid way to input a number must be selected: ' + JSON.stringify(options))
	}
	let num: number
	switch (field_type) {
		case NumberVariableFieldType.Number.valueOf():
			num = options[`${id}_number`] as number
			break
		case NumberVariableFieldType.TextVariables.valueOf(): {
			const res = await parseVariablesInString(options[`${id}_text`] as string)
			console.log('Entered str value:', options[`${id}_text`], res)
			num = parseFloat(res)
			break
		}
		default:
			throw new Error('Unknown way to input a number')
	}
	if (typeof num !== 'number' || !isFinite(num)) {
		throw new Error('Make sure you enter a valid, finite number.')
	}
	if (num < min || num > max) {
		throw new Error(`Entered number ${num} was outside valid range of [${min},${max}]`)
	}
	return num
}
