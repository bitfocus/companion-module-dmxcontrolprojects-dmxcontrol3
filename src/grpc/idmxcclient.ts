import type {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	CompanionPresetDefinitions,
	CompanionVariableDefinition,
} from '@companion-module/base'
import { Client } from '@grpc/grpc-js'

/**
 * Lets a sub client report partial failures (e.g. a lost change stream) so the instance status reflects them.
 * `component` identifies the failing part; reporting `recovered` for it clears the warning again.
 */
export interface HealthReporter {
	degraded(component: string, message: string): void
	recovered(component: string): void
}

export interface IDMXCClient {
	grpcclient: Client

	startClient(
		updatePresets: () => void,
		updateActions: () => void,
		updateFeedbacks: () => void,
		updateVariables: () => void,
	): void | Promise<void>

	generateActions(): CompanionActionDefinitions

	generateFeedbacks(): CompanionFeedbackDefinitions

	generatePresets(): CompanionPresetDefinitions

	generateVariables(): CompanionVariableDefinition[]

	close(): void
}
