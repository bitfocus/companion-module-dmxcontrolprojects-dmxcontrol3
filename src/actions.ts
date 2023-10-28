import { CompanionActionDefinition, CompanionActionDefinitions } from '@companion-module/base'
import { ModuleInstance } from './main'

export enum ActionId {
	Default = 'sample_action',
}

export function UpdateActions(self: ModuleInstance): CompanionActionDefinitions {
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.Default]: {
			name: 'My First Action',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Test',
					default: 5,
					min: 0,
					max: 100,
				},
			],
			callback: async (event) => {
				console.log('Hello world!', event.options.num)
			},
		},
	}

	return actions
}
