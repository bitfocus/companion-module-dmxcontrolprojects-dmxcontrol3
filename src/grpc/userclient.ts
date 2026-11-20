import { UserClientClient } from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobufClient'
import type { IDMXCClient } from './idmxcclient.js'
import * as GRPC from '@grpc/grpc-js'
import type {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	CompanionPresetDefinitions,
	CompanionVariableDefinition,
} from '@companion-module/base'

export class UserClient implements IDMXCClient {
	grpcclient: UserClientClient

	constructor(
		endpoint: string,
		//private metadata: Metadata,
		//private instance: DMXCModuleInstance
	) {
		this.grpcclient = new UserClientClient(endpoint, GRPC.credentials.createInsecure())
	}

	startClient(): void {
		throw new Error('Method not implemented.')
	}
	generateActions(): CompanionActionDefinitions {
		throw new Error('Method not implemented.')
	}
	generateFeedbacks(): CompanionFeedbackDefinitions {
		throw new Error('Method not implemented.')
	}
	generatePresets(): CompanionPresetDefinitions {
		throw new Error('Method not implemented.')
	}
	generateVariables(): CompanionVariableDefinition[] {
		throw new Error('Method not implemented.')
	}

	close(): void {
		this.grpcclient.close()
	}
}
