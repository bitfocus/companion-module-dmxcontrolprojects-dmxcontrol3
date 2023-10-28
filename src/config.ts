import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export interface Config {
	host: string
	port: number
	netid: string
}

export const configFields = (): SomeCompanionConfigField[] => {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 17475,
		},
		{
			type: 'textinput',
			id: 'netid',
			label: 'Net ID',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			id: 'devicename',
			label: 'Device Name',
			width: 12,
			default: 'Companion',
		},
	]
}
