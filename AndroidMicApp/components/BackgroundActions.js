import BackgroundService from 'react-native-background-actions';

// This keeps the JS Bridge alive so App.js listeners don't freeze.
const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

const activeTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;

    // This loop keeps the service alive.
    // While this runs, App.js LiveAudioStream.on events continue to fire.
    while (BackgroundService.isRunning()) {
        await sleep(delay);
    }
};

// 2. Configuration
const options = {
    taskName: 'MicStream_KeepAlive',
    taskTitle: 'Streaming Audio',
    taskDesc: 'AndroidMic is sending microphone audio to the desktop receiver',
    linkingURI: 'androidmic://',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#C5612D',
    parameters: {
        delay: 2000,
    },
};

// 3. Manager Functions
export const startBackgroundService = async () => {
    if (!BackgroundService.isRunning()) {
        await BackgroundService.start(activeTask, options);
        console.log("Service Started: WakeLock Active");
    }
};

export const stopBackgroundService = async () => {
    if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
        console.log("Service Stopped: WakeLock Released");
    }
};

