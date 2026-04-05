const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const readline = require("node:readline/promises");
const process = require("node:process");

const APP_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(APP_DIR, "..");
const ANDROID_DIR = path.join(APP_DIR, "android");
const GRADLEW_BAT_PATH = path.join(ANDROID_DIR, "gradlew.bat");
const APP_PACKAGE = "com.androidmicapp";
const CHECK_DEVICES_EXE_PATH = path.join(ROOT_DIR, "dist", "check_devices.exe");
const RECEIVER_EXE_PATH = path.join(ROOT_DIR, "dist", "main.exe");
const RELEASE_APK_PATH = path.join(
  ANDROID_DIR,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
const DEFAULT_PORT = 8082;
const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 1;
const DOWNLOADS = {
  adb: "https://developer.android.com/tools/releases/platform-tools",
  python: "https://www.python.org/downloads/windows/",
  vbAudio: "https://vb-audio.com/Cable/",
};

function printStep(message) {
  console.log(`\n== ${message} ==`);
}

function fail(message, link) {
  console.error(`\n[ERROR] ${message}`);
  if (link) {
    console.error(`Download: ${link}`);
  }
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: options.stdio ?? "pipe",
    encoding: "utf8",
    shell: false,
  });

  if (result.error) {
    return { status: 1, stdout: "", stderr: result.error.message };
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function commandExists(binary) {
  const result = runCommand("where", [binary]);
  return result.status === 0;
}

function ensureWindows() {
  if (process.platform !== "win32") {
    fail("This orchestration tool only supports Windows.");
  }
}

function ensureBinary(binary, label, link) {
  if (!commandExists(binary)) {
    fail(`${label} was not found in PATH.`, link);
  }
}

function ensureMainScriptExists() {
  const mainPath = path.join(ROOT_DIR, "main.py");
  if (!fs.existsSync(mainPath)) {
    fail(`Python entrypoint not found at ${mainPath}.`);
  }
}

function ensureGradleWrapperExists() {
  if (!fs.existsSync(GRADLEW_BAT_PATH)) {
    fail(`Gradle wrapper not found at ${GRADLEW_BAT_PATH}.`);
  }
}


function listAudioOutputDevices() {
  if (!fs.existsSync(CHECK_DEVICES_EXE_PATH)) {
    return {
      status: 1,
      stdout: "",
      stderr: `Audio device checker not found at ${CHECK_DEVICES_EXE_PATH}.`,
    };
  }

  return runCommand(CHECK_DEVICES_EXE_PATH, [], { cwd: ROOT_DIR, stdio: "inherit" });
}

function getReceiverRuntime() {
  if (fs.existsSync(RECEIVER_EXE_PATH)) {
    return {
      command: RECEIVER_EXE_PATH,
      usesPython: false,
    };
  }

  return {
    command: "python",
    usesPython: true,
  };
}

async function ensureVbAudioInstalled(rl) {
  console.log("Listing available audio output devices...\n");
  const result = listAudioOutputDevices();

  if (result.status !== 0) {
    console.log("\nWarning: Unable to list devices automatically.");
    console.log(result.stderr || "Unknown audio device listing error.");
    console.log(`Build it with: pyinstaller --onefile check_devices.py --distpath dist`);
  }

  console.log(
    `\nVB-Audio Virtual Cable ("CABLE Input") should appear in the list above.`,
  );
  console.log(`If it is missing, install it first: ${DOWNLOADS.vbAudio}`);

  const proceed = await askYesNo(rl, "\nProceed with setup?", true);
  if (!proceed) {
    fail("Setup cancelled. Install VB-Audio Virtual Cable and run again.", DOWNLOADS.vbAudio);
  }
}

function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("*"))
    .map((line) => {
      const [serial, state, ...details] = line.split(/\s+/);
      return {
        serial,
        state,
        details: details.join(" "),
      };
    });
}

function getAuthorizedDevices() {
  const result = runCommand("adb", ["devices"]);
  if (result.status !== 0) {
    fail("Unable to run adb devices.", DOWNLOADS.adb);
  }

  const parsed = parseAdbDevices(result.stdout);
  return {
    authorized: parsed.filter((device) => device.state === "device"),
    rejected: parsed.filter((device) => device.state !== "device"),
  };
}

async function askYesNo(rl, question, defaultYes = true) {
  const suffix = defaultYes ? " [Y/n]: " : " [y/N]: ";
  const answer = (await rl.question(question + suffix)).trim().toLowerCase();

  if (!answer) {
    return defaultYes;
  }

  return answer === "y" || answer === "yes";
}

async function waitForUser(rl, message) {
  await rl.question(`${message}\nPress Enter to continue... `);
}

async function selectDevice(rl, devices) {
  if (devices.length === 1) {
    console.log(`Using Android device: ${devices[0].serial}`);
    return devices[0].serial;
  }

  console.log("Multiple authorized Android devices detected:");
  devices.forEach((device, index) => {
    const details = device.details ? ` ${device.details}` : "";
    console.log(`  ${index + 1}. ${device.serial}${details}`);
  });

  while (true) {
    const answer = (await rl.question("Select the device number to use: ")).trim();
    const selectedIndex = Number.parseInt(answer, 10);
    if (!Number.isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= devices.length) {
      return devices[selectedIndex - 1].serial;
    }
    console.log("Enter a valid device number.");
  }
}

async function waitForAuthorizedDevice(rl) {
  while (true) {
    const { authorized, rejected } = getAuthorizedDevices();
    if (authorized.length > 0) {
      return selectDevice(rl, authorized);
    }

    console.log("No authorized Android device was found.");
    if (rejected.length > 0) {
      console.log("Detected devices are not ready yet:");
      rejected.forEach((device) => {
        console.log(`  - ${device.serial}: ${device.state}`);
      });
    }

    console.log("Check the USB cable, unlock the device, and approve the USB debugging prompt.");
    const retry = await askYesNo(rl, "Retry adb device detection?", true);
    if (!retry) {
      fail("Android device validation was not completed.");
    }
  }
}

function runAttachedProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const isWindowsScript = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
    const spawnOptions = {
      cwd,
      stdio: "inherit",
      shell: isWindowsScript,
    };

    console.log(`> ${command} ${args.join(" ")}`);
    console.log(`  cwd: ${cwd}`);

    const child = spawn(command, args, spawnOptions);

    child.on("error", (error) => {
      error.message = `${error.message} (command: ${command}, cwd: ${cwd})`;
      reject(error);
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

function ensureReleaseApkExists() {
  if (!fs.existsSync(RELEASE_APK_PATH)) {
    fail(
      "Release APK was not generated as expected. Check Gradle output for build failures.",
    );
  }
}

function isAppInstalledOnDevice(deviceSerial) {
  const result = runCommand(
    "adb",
    ["-s", deviceSerial, "shell", "pm", "path", APP_PACKAGE],
    { cwd: ROOT_DIR },
  );

  if (result.status !== 0) {
    return false;
  }

  return result.stdout.toLowerCase().includes("package:");
}

async function promptPort(rl) {
  while (true) {
    const answer = (await rl.question(`Port [${DEFAULT_PORT}]: `)).trim();
    if (!answer) {
      return DEFAULT_PORT;
    }

    const port = Number.parseInt(answer, 10);
    if (!Number.isNaN(port) && port >= 1 && port <= 65535) {
      return port;
    }

    console.log("Enter a valid TCP port between 1 and 65535.");
  }
}

async function promptDeviceId(rl) {
  while (true) {
    const answer = (await rl.question("Audio device_id (type 'list' to show output devices): ")).trim();
    if (!answer) {
      console.log("device_id is required.");
      continue;
    }

    if (answer.toLowerCase() === "list") {
      console.log("\nListing available output devices...\n");
      const result = listAudioOutputDevices();
      if (result.status !== 0) {
        console.log("Unable to list audio devices automatically.");
        console.log(result.stderr || "Unknown audio device listing error.");
      }
      continue;
    }

    const deviceId = Number.parseInt(answer, 10);
    if (!Number.isNaN(deviceId)) {
      return deviceId;
    }

    console.log("Enter a numeric device_id.");
  }
}

async function main() {
  ensureWindows();
  ensureGradleWrapperExists();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    printStep("Validating environment");
    ensureBinary("adb", "ADB", DOWNLOADS.adb);

    const receiverRuntime = getReceiverRuntime();
    if (receiverRuntime.usesPython) {
      ensureBinary("python", "Python", DOWNLOADS.python);
      ensureMainScriptExists();
    }

    await ensureVbAudioInstalled(rl);

    printStep("Prepare Android device");
    console.log("1. Connect the Android device over USB.");
    console.log("2. Enable USB debugging in Developer options.");
    console.log("3. Accept the USB debugging prompt on the device when it appears.");
    await waitForUser(rl, "Complete the Android device steps now.");

    printStep("Validate connected device");
    const selectedDevice = await waitForAuthorizedDevice(rl);

    printStep("Build release APK");
    console.log("Building a standalone release APK. Do not disconnect the device.");
    const buildExitCode = await runAttachedProcess(
      GRADLEW_BAT_PATH,
      [":app:assembleRelease"],
      ANDROID_DIR,
    );
    if (buildExitCode !== 0) {
      fail("Gradle release build failed.");
    }

    ensureReleaseApkExists();

    printStep("Install release APK on device");
    console.log("Installing APK with adb install -r -d so it remains as a regular app.");
    const installExitCode = await runAttachedProcess(
      "adb",
      ["-s", selectedDevice, "install", "-r", "-d", RELEASE_APK_PATH],
      ROOT_DIR,
    );
    if (installExitCode !== 0) {
      fail("adb install failed. Confirm the device is unlocked and USB debugging is still enabled.");
    }

    if (!isAppInstalledOnDevice(selectedDevice)) {
      fail(
        "Install verification failed. Android package was not detected after adb install.",
      );
    }

    printStep("Open the Android app");
    await waitForUser(rl, "Open the app manually on the device before continuing.");

    printStep("Configure Python runtime");
    const port = await promptPort(rl);
    const deviceId = await promptDeviceId(rl);

    printStep("Create ADB reverse tunnel");
    const reverseResult = runCommand("adb", ["-s", selectedDevice, "reverse", `tcp:${port}`, `tcp:${port}`], {
      cwd: ROOT_DIR,
    });
    if (reverseResult.status !== 0) {
      fail("adb reverse failed. Keep the device connected and try again.");
    }

    printStep("Start desktop audio receiver");
    const runtimeMode = receiverRuntime.usesPython
      ? "Python runtime"
      : "bundled executable";
    console.log(`Starting desktop receiver using ${runtimeMode}.`);
    console.log("The service will stay attached to this terminal until you stop it.");
    console.log("Verify audio in your recording software with: CABLE Output (VB-Audio Virtual Cable)");
    console.log("Stop the service with Ctrl+C.\n");

    const receiverArgs = [
      ...(receiverRuntime.usesPython ? [path.join(ROOT_DIR, "main.py")] : []),
      "--port",
      String(port),
      "--device_id",
      String(deviceId),
      "--sample_rate",
      String(DEFAULT_SAMPLE_RATE),
      "--channels",
      String(DEFAULT_CHANNELS),
    ];

    const serviceExitCode = await runAttachedProcess(
      receiverRuntime.command,
      receiverArgs,
      ROOT_DIR,
    );
    process.exitCode = serviceExitCode;
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`\n[ERROR] ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
