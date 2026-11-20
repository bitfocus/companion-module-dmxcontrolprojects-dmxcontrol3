import { Metadata } from '@grpc/grpc-js'
import * as GRPC from '@grpc/grpc-js'
import { DMXCModuleInstance } from '../main.js'
import {
	EChangeType,
	GetMultipleRequest,
	GetRequest,
} from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobuf'
import {
	MacroChangedMessage,
	MacroSetFaderStateRequest,
	MacroSetButtonStateRequest,
	MacroDescriptor,
} from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobuf.Macro'
import { MacroClientClient } from '@dmxcontrolprojects/dmxcontrol3-network-interface/LumosProtobufClient'
import type { HealthReporter, IDMXCClient } from './idmxcclient.js'
import {
	combineRgb,
	type CompanionActionContext,
	type CompanionFeedbackContext,
	type CompanionOptionValues,
	type CompanionActionDefinition,
	type CompanionActionDefinitions,
	type CompanionFeedbackDefinition,
	type CompanionFeedbackDefinitions,
	type CompanionPresetDefinitions,
	type CompanionVariableDefinition,
} from '@companion-module/base'
import { RepositoryBase } from '../dmxcstate/repositorybase.js'
import { callOpts } from '../utils.js'

/** Context shared by action and feedback callbacks (the base type is not exported from @companion-module/base) */
type CompanionCommonCallbackContext = CompanionActionContext | CompanionFeedbackContext

enum MacroActions {
	PressButton = 'press_button_macro',
	ReleaseButton = 'release_button_macro',
	IncrementFader = 'increment_fader_macro',
	DecrementFader = 'decrement_fader_macro',
	SetFaderAbsolute = 'absolute_fader_macro',
}

enum MacroFeedbacks {
	ButtonState = 'buttonstate_macro',
	ButtonName = 'buttonname_macro',
	FaderName = 'fadername_macro',
	FaderState = 'faderstate_macro',
	Image = 'bitmap_macro',
}

export class MacroClient implements IDMXCClient {
	grpcclient: MacroClientClient
	repo: RepositoryBase<MacroDescriptor>

	constructor(
		endpoint: string,
		private metadata: Metadata,
		private instance: DMXCModuleInstance,
		private health: HealthReporter,
	) {
		this.repo = new RepositoryBase<MacroDescriptor>()
		this.grpcclient = new MacroClientClient(endpoint, GRPC.credentials.createInsecure())
	}

	startClient(updatePresets: () => void, updateActions: () => void, updateFeedbacks: () => void): void {
		// The id dropdowns list the repo contents, so actions and feedbacks must be regenerated with the presets
		const updateDefinitions = () => {
			updatePresets()
			updateActions()
			updateFeedbacks()
		}
		this.grpcclient.getMacros(
			GetMultipleRequest.create({
				requestId: this.instance.getRequestId(),
			}),
			this.metadata,
			callOpts(),
			(error, response) => {
				if (error) {
					this.instance.log('error', 'Loading macros failed: ' + error.message)
					this.health.degraded('macros-load', 'Could not load macros')
					return
				}
				this.health.recovered('macros-load')
				response.macros.forEach((macro) => {
					this.repo.add(macro)
				})
				updateDefinitions()
				this.instance.checkFeedbacks(
					MacroFeedbacks.ButtonState,
					MacroFeedbacks.ButtonName,
					MacroFeedbacks.FaderName,
					MacroFeedbacks.FaderState,
					MacroFeedbacks.Image,
				)
			},
		)
		this.grpcclient
			.receiveMacroChanges(GetRequest.create({ requestId: this.instance.getRequestId() }), this.metadata)
			.on('data', (response: MacroChangedMessage) => {
				this.instance.log('debug', `MacroClient received change for macro: ${JSON.stringify(response.macroData)}`)
				switch (response.changeType) {
					case EChangeType.Added:
						if (response.macroData) {
							this.repo.add(response.macroData)
							updateDefinitions()
						}
						break
					case EChangeType.Changed:
						if (response.macroData) {
							this.repo.add(response.macroData)
						}
						break
					case EChangeType.Removed:
						if (response.macroData) {
							this.repo.remove(response.macroData.id)
							updateDefinitions()
						}
						break
				}
				this.instance.checkFeedbacks(
					MacroFeedbacks.ButtonState,
					MacroFeedbacks.ButtonName,
					MacroFeedbacks.FaderName,
					MacroFeedbacks.FaderState,
					MacroFeedbacks.Image,
				)
			})
			.on('error', (err: Error) => {
				this.instance.log('error', 'Macro change stream: ' + err.message)
				this.health.degraded('macros-stream', 'Macro updates lost')
			})
	}

	/**
	 * Resolves the macro selected with the fields from `repo.generateIdOption` (dropdown or text with variables).
	 * Returns undefined if it can't be found; logs the reason when `logErrors` is set (used for actions, not feedbacks).
	 */
	private async resolve(
		options: CompanionOptionValues,
		ctx: CompanionCommonCallbackContext,
		logErrors = false,
	): Promise<MacroDescriptor | undefined> {
		try {
			return await this.repo.checkAndGetIdOption(options, async (t) => ctx.parseVariablesInString(t))
		} catch (err) {
			if (logErrors) this.instance.log('warn', (err as Error).message)
			return undefined
		}
	}

	generateActions(): CompanionActionDefinitions {
		const actions: Record<MacroActions, CompanionActionDefinition> = {
			[MacroActions.PressButton]: {
				name: 'Press Macro Button',
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'ButtonNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (event, ctx) => {
					if (typeof event.options.num !== 'number') return Promise.resolve()

					const macro = await this.resolve(event.options, ctx, true)

					if (macro === undefined) return Promise.resolve()

					const request = MacroSetButtonStateRequest.create({
						requestId: this.instance.getRequestId(),
						buttonNumber: event.options.num,
						macroId: macro.id,
						active: true,
					})
					this.grpcclient.setMacroButtonState(request, this.metadata, callOpts(), (error, response) => {
						if (error) {
							this.instance.log('error', error.message)
							return
						}
						if (!response.ok)
							this.instance.log('error', `Error pressing Executorbutton: ${response.message?.formatString ?? ''}`)
					})
				},
			},
			[MacroActions.ReleaseButton]: {
				name: 'Release Macro Button',
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'ButtonNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (event, ctx) => {
					if (typeof event.options.num !== 'number') return Promise.resolve()

					const macro = await this.resolve(event.options, ctx, true)

					if (macro === undefined) return Promise.resolve()

					const request = MacroSetButtonStateRequest.create({
						requestId: this.instance.getRequestId(),
						buttonNumber: event.options.num,
						macroId: macro.id,
						active: false,
					})
					this.grpcclient.setMacroButtonState(request, this.metadata, callOpts(), (error, response) => {
						if (error) {
							this.instance.log('error', error.message)
							return
						}
						if (!response.ok)
							this.instance.log('error', `Error pressing Executorbutton: ${response.message?.formatString ?? ''}`)
					})
				},
			},
			[MacroActions.IncrementFader]: {
				name: 'Increment Macro Fader',
				options: [
					{
						id: 'step',
						type: 'number',
						label: 'StepSize in %',
						default: 5,
						min: 1,
						max: 100,
					},
					{
						id: 'num',
						type: 'number',
						label: 'FaderNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (event, ctx) => {
					if (typeof event.options.step !== 'number' || typeof event.options.num !== 'number') return Promise.resolve()

					const macro = await this.resolve(event.options, ctx, true)

					if (macro === undefined) return Promise.resolve()

					const request = MacroSetFaderStateRequest.create()

					request.requestId = this.instance.getRequestId()
					request.macroId = macro.id
					request.faderNumber = event.options.num
					request.increment = event.options.step / 100
					this.grpcclient.setMacroFaderState(request, this.metadata, callOpts(), (error, response) => {
						if (error) {
							this.instance.log('error', error.message)
							return
						}
						if (!response.ok)
							this.instance.log('error', `Error setting Macrofader: ${response.message?.formatString ?? ''}`)
					})
				},
			},
			[MacroActions.DecrementFader]: {
				name: 'Decrement Macro Fader',
				options: [
					{
						id: 'step',
						type: 'number',
						label: 'StepSize in %',
						default: 5,
						min: 1,
						max: 100,
					},
					{
						id: 'num',
						type: 'number',
						label: 'FaderNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (event, ctx) => {
					if (typeof event.options.step !== 'number' || typeof event.options.num !== 'number') return Promise.resolve()

					const macro = await this.resolve(event.options, ctx, true)

					if (macro === undefined) return Promise.resolve()

					const request = MacroSetFaderStateRequest.create()

					request.requestId = this.instance.getRequestId()

					request.macroId = macro.id
					request.faderNumber = event.options.num
					request.increment = -event.options.step / 100
					this.grpcclient.setMacroFaderState(request, this.metadata, callOpts(), (error, response) => {
						if (error) {
							this.instance.log('error', error.message)
							return
						}
						if (!response.ok)
							this.instance.log('error', `Error setting Macrofader: ${response.message?.formatString ?? ''}`)
					})
				},
			},
			[MacroActions.SetFaderAbsolute]: {
				name: 'Set Macro Fader',
				options: [
					{
						id: 'value',
						type: 'number',
						label: 'Facervalue in %',
						default: 50,
						min: 1,
						max: 100,
					},
					{
						id: 'num',
						type: 'number',
						label: 'FaderNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (event, ctx) => {
					if (typeof event.options.value !== 'number' || typeof event.options.num !== 'number') return Promise.resolve()

					const macro = await this.resolve(event.options, ctx, true)

					if (macro === undefined) return Promise.resolve()

					const request = MacroSetFaderStateRequest.create()

					request.requestId = this.instance.getRequestId()

					request.macroId = macro.id
					request.faderNumber = event.options.num
					request.absolut = event.options.value / 100
					this.grpcclient.setMacroFaderState(request, this.metadata, callOpts(), (error, response) => {
						if (error) {
							this.instance.log('error', error.message)
							return
						}
						if (!response.ok)
							this.instance.log('error', `Error setting Macrofader: ${response.message?.formatString ?? ''}`)
					})
				},
			},
		}
		return actions
	}
	generateFeedbacks(): CompanionFeedbackDefinitions {
		const feedbacks: Record<MacroFeedbacks, CompanionFeedbackDefinition> = {
			[MacroFeedbacks.ButtonState]: {
				name: 'Macro Button State',
				type: 'boolean',
				defaultStyle: {
					bgcolor: combineRgb(255, 0, 0),
					color: combineRgb(0, 0, 0),
				},
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'ButtonNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (feedback, ctx) => {
					if (typeof feedback.options.num !== 'number') return false
					const macro = await this.resolve(feedback.options, ctx)
					if (macro === undefined) return false
					return macro.buttons[feedback.options.num - 1].active
				},
			},
			[MacroFeedbacks.ButtonName]: {
				name: 'Macro Button Name',
				type: 'advanced',
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'ButtonNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (feedback, ctx) => {
					if (typeof feedback.options.num !== 'number') return { text: '' }
					const macro = await this.resolve(feedback.options, ctx)
					if (macro === undefined) return { text: '' }
					return {
						text: macro.buttons[feedback.options.num - 1].label,
					}
				},
			},
			[MacroFeedbacks.FaderName]: {
				name: 'Macro Fader Name',
				type: 'advanced',
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'FaderNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (feedback, ctx) => {
					if (typeof feedback.options.num !== 'number') return { text: '' }
					const macro = await this.resolve(feedback.options, ctx)
					if (macro === undefined) return { text: '' }
					return {
						text: macro.faders[feedback.options.num - 1].label,
					}
				},
			},
			[MacroFeedbacks.FaderState]: {
				name: 'Macro Fader State',
				type: 'advanced',
				options: [
					{
						id: 'num',
						type: 'number',
						label: 'FaderNumber',
						default: 1,
						min: 1,
						max: 100,
					},
					...this.repo.generateIdOption('Macro ID or Name'),
				],
				callback: async (feedback, ctx) => {
					if (typeof feedback.options.num !== 'number') return { text: '' }
					const macro = await this.resolve(feedback.options, ctx)
					if (macro === undefined) return { text: '' }
					return {
						text: `${(macro.faders[feedback.options.num - 1].faderPosition * 100).toFixed(0)}%`,
					}
				},
			},
			[MacroFeedbacks.Image]: {
				name: 'Macro Image',
				type: 'advanced',
				options: [...this.repo.generateIdOption('Macro ID or Name')],
				callback: async (feedback, ctx) => {
					const image = (await this.resolve(feedback.options, ctx))?.bitmap
					if (image) {
						const base64 = Buffer.from(image).toString('base64')
						return { png64: base64, show_topbar: false }
					}
					return {}
				},
			},
		}

		return feedbacks
	}
	generatePresets(): CompanionPresetDefinitions {
		const macropresets: CompanionPresetDefinitions = {}
		for (const macro of this.repo.getAll()) {
			const name = macro.name
			for (const button of macro.buttons) {
				macropresets[`${macro.id}_button_${button.number}`] = {
					type: 'button',
					category: name,
					name: `Button${button.number}`,
					style: {
						text: `Button ${button.number}`,
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: MacroActions.PressButton,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: button.number,
									},
								},
							],
							up: [
								{
									actionId: MacroActions.ReleaseButton,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: button.number,
									},
								},
							],
						},
					],
					feedbacks: [
						{
							feedbackId: MacroFeedbacks.ButtonState,
							options: {
								id_or_name_type: 'dropdown',
								id_or_name_choice: macro.id,
								num: button.number,
							},
							style: {
								bgcolor: combineRgb(255, 0, 0),
							},
						},
						{
							feedbackId: MacroFeedbacks.ButtonName,
							options: {
								id_or_name_type: 'dropdown',
								id_or_name_choice: macro.id,
								num: button.number,
							},
						},
					],
				}
			}
			for (const fader of macro.faders) {
				macropresets[`${macro.id}_fader_${fader.number}`] = {
					type: 'button',
					category: name,
					name: `Fader${fader.number}`,
					style: {
						text: `Fader ${fader.number}`,
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					options: {
						rotaryActions: true,
					},
					steps: [
						{
							down: [],
							up: [],
							rotate_left: [
								{
									actionId: MacroActions.DecrementFader,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: fader.number,
										step: 5,
									},
								},
							],
							rotate_right: [
								{
									actionId: MacroActions.IncrementFader,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: fader.number,
										step: 5,
									},
								},
							],
						},
					],
					feedbacks: [
						{
							feedbackId: MacroFeedbacks.FaderState,
							options: {
								id_or_name_type: 'dropdown',
								id_or_name_choice: macro.id,
								num: fader.number,
							},
							style: {
								bgcolor: combineRgb(255, 0, 0),
							},
						},
					],
				}
				macropresets[`${macro.id}_fader_${fader.number}_inc`] = {
					type: 'button',
					category: name,
					name: `Increment Fader ${fader.number}`,
					style: {
						text: '⬆️',
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: MacroActions.IncrementFader,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: fader.number,
										step: 5,
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				}
				macropresets[`${macro.id}_fader_${fader.number}_dec`] = {
					type: 'button',
					category: name,
					name: `Decrement Fader ${fader.number}`,
					style: {
						text: '⬇️',
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: MacroActions.DecrementFader,
									options: {
										id_or_name_type: 'dropdown',
										id_or_name_choice: macro.id,
										num: fader.number,
										step: 5,
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				}
			}
		}
		return macropresets
	}
	generateVariables(): CompanionVariableDefinition[] {
		return []
	}

	close(): void {
		this.grpcclient.close()
	}
}
