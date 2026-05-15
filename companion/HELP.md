## DMXControl Companion Module

This module is designed to control DMXControl version 3.3.0.  
It enables seamless integration between Companion and DMXControl, allowing you to trigger macros, control executors, and monitor feedback directly from your Companion interface.

[Learn more about DMXControl on the official homepage.](https://www.dmxcontrol.de/)

## Configuration

- **Net ID**: Use the Network ID from DMXControl Umbra to enable automatic connection.
- **Device Name**: A custom name to register Companion in the DMXC network.
- **Disable Auto-discovery**: Enable this option to prevent automatic connection using the Network ID.
- **Target IP**: IP address for manually connecting to Umbra.
- **Target Port**: TCP port for manual connection to Umbra.
- **Username & Password**: Reserved for future use.

## Supported Actions

### For Executor or Macro

- **Press Button**: Press a macro or executor button (numbers 1–4).
- **Release Button**: Release the pressed button.
- **Increment Fader**: Increase the fader value by a step size.
- **Decrement Fader**: Decrease the fader value by a step size.
- **Set Fader**: Set the fader to a specific value.

### For Cuelists

- **Set intensity/fade factor/speed factor**: Sets the slider value of the intensity/fade factor/speed factor slider for that cuelist to the specified value using either a fixed numeric value or a variable
- **Run action**: Presses/Runs the selected action (PLAY, PAUSE, STOP, GO BACK, GO, REASSIGN_SCENE_NUMBERS) on the cuelist or (GO TO, GO NEXT, LOAD) on cue with specified index (0 based)
- **Set play mode**: Sets the play mode (Once, Loop, Bounce, Random) the cuelist should play in

## Supported Feedback

- **Button State**: Indicates if the button is pressed.
- **Button Name**: Displays the name of the selected button.
- **Fader State**: Shows the current value of the fader.
- **Fader Name**: Displays the name of the fader.
- **Macro Image**: Displays the image associated with the macro.

### For Cuelists

- **Check state**: Indicates if the cuelist has the selected (STOPPED, PAUSED, RUNNING) state
- **Previous/Current/Next cue**: Indicates if the cue (specified by 0 based index) is currently the previous/current/next cue
- **Cue progress reached**: Indicates if the progress (bar in progress columne) of the cue (specified by 0 based index) reaches the selected state and value
    - _Note_: This enables the progress updates for the selected cuelist. This will add the `cuelist_[LIST_ID]_cue_[CUE_INDEX]_[...]` variables for all cues of the cuelist.

## Supported variables

### For Cuelists

Per cuelist:

- `cuelist_[LIST_ID]_name`: User set name of the cuelist
- `cuelist_[LIST_ID]_currentCue`: The cue number (value of column, NOT the index) of the current cue
- `cuelist_[LIST_ID]_nextCue`: Thecue number (value of column, NOT the index) of the next cue
- `cuelist_[LIST_ID]_intensity`: Value of the intensity slider (0 to 1)
- `cuelist_[LIST_ID]_fadeFactor`: Value of the fade factor/multiplier (1 = 100%)
- `cuelist_[LIST_ID]_speedFactor`: Value of the speed factor/multiplier (1 = 100%)
- `cuelist_[LIST_ID]_playMode`: Play mode of the cuelist as string (Once, Loop, Random, Bounce)

Per cue per cuelist:

- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_number`: Cue number (value of column) for the cue at CUE_INDEX (0 based)
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_name`: Name string of the cue at CUE_INDEX (0 based)

Per cue per cuelist (ONLY IF at least 1 `Cue progress reached` feedback exists for this cuelist):

> _Note_: Keeping these valiables updated is relatively resource intensive. They only exists if the required feedback is added, which should only be done where required.

- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_state`: The numeric state(s) of the cue (see below), ORed together
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_stateStr`: The state(s) of the cue as string (joined by "|"), empty of none
    - States (with numeric values): Preparing = 0x1, Prepared = 0x2, Waiting = 0x4, Fading = 0x8, Playing = 0x10, Played = 0x20, Stopping = 0x40, Stopped = 0x80
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_progress`: Progress of cue (between 0 and 1), value of progress bar in progress column.
    - When waiting/following/delay, fading in, fading out (outgoing/decreasing)
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_msToWait`: Time in ms until cue is triggered
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_fadeTimeLeft`: Time in ms left in fade (only incoming, not outgoing)
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_delayTimeLeft`: Time in ms left in pre delay
- `cuelist_[LIST_ID]_cue_[CUE_INDEX]_durationTimeLeft`: Time in ms n fade duration?
