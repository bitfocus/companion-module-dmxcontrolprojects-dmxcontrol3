import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionStaticUpgradeScript,
} from '@companion-module/base'
import type { Config } from './config.js'

/** Macro and executor actions/feedbacks whose single `id` textinput became the `generateIdOption` fields */
const ID_OPTION_ACTIONS = [
	'press_button_macro',
	'release_button_macro',
	'increment_fader_macro',
	'decrement_fader_macro',
	'absolute_fader_macro',
	'press_button_executor',
	'release_button_executor',
	'increment_fader_executor',
	'decrement_fader_executor',
	'absolute_fader_executor',
]
const ID_OPTION_FEEDBACKS = [
	'buttonstate_macro',
	'buttonname_macro',
	'fadername_macro',
	'faderstate_macro',
	'bitmap_macro', // used `macroid` instead of `id`
	'buttonstate_executor',
	'buttonname_executor',
	'fadername_executor',
	'faderstate_executor',
]

/**
 * Moves the old free-text id/name into the "Text/Variables" mode of the new id fields,
 * which keeps the old behaviour (lookup by id or name) and adds variable support.
 */
function migrateIdOption<T extends CompanionMigrationAction | CompanionMigrationFeedback>(item: T): T | undefined {
	const options = item.options
	if ('id_or_name_type' in options) return undefined
	const oldKey = 'macroid' in options ? 'macroid' : 'id'
	const oldValue = options[oldKey]
	options.id_or_name_type = 'textinput'
	options.id_or_name_text = typeof oldValue === 'string' ? oldValue : ''
	options.id_or_name_choice = ''
	delete options[oldKey]
	return item
}

export const UpgradeScripts = (): CompanionStaticUpgradeScript<Config>[] => {
	return [
		/*
		 * Place your upgrade scripts here
		 * Remember that once it has been added it cannot be removed!
		 */
		// v1.2.x: macro/executor id fields support dropdown selection and variables
		function (_context, props) {
			return {
				updatedConfig: null,
				updatedActions: props.actions
					.filter((a) => ID_OPTION_ACTIONS.includes(a.actionId))
					.map(migrateIdOption)
					.filter((a) => a !== undefined),
				updatedFeedbacks: props.feedbacks
					.filter((f) => ID_OPTION_FEEDBACKS.includes(f.feedbackId))
					.map(migrateIdOption)
					.filter((f) => f !== undefined),
			}
		},
	]
}
