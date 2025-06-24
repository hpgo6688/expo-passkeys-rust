import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const TARGETS: Record<string, string> = {
    ios: "aarch64-apple-ios",
    "ios-sim": "aarch64-apple-ios-sim",
};

interface ModuleConfig {
    name: string;
    nativeLibDir: string;
}

const MODULES: ModuleConfig[] = [
    {
        name: "my-rust-module",
        nativeLibDir: "native_rust_lib",
    },
];

function runCommandSync(command: string, args: string[], options = {}) {
    const result = spawnSync(command, args, { stdio: "inherit", ...options });
    if (result.error) {
        console.error(`Error executing ${command}:`, result.error);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`${command} exited with code ${result.status}`);
        process.exit(1);
    }
}

function cargoBuild(target: string) {
    runCommandSync("cargo", ["build", "--release", "--target", target]);
}

function getTarget(): string {
    const args = process.argv.slice(2);
    const target = (args[0] ?? "").replace("--target=", "");

    if (!TARGETS[target]) {
        console.error(
            `Invalid target ${target} found. Please specify --target=ios or --target=ios-sim`
        );
        process.exit(1);
    }

    return target;
}

function buildModule(module: ModuleConfig, target: string) {
    const { name, nativeLibDir } = module;
    console.log(`Building ${name} for target ${target}`);

    const originalCwd = process.cwd();
    
    const nativeLibPath = path.join(originalCwd, nativeLibDir);
    process.chdir(nativeLibPath);

    console.log(`Building rust library for ${name}`);
    cargoBuild(target);

    console.log(`Generating bindings for ${name}`);
    runCommandSync(
        "cbindgen",
        [
            "--lang",
            "c",
            "--crate",
            nativeLibDir,
            "--output",
            `${nativeLibDir}.h`,
        ]
    );

    process.chdir(originalCwd);

    const destinationPath = path.join(
        originalCwd,
        "modules",
        name,
        "ios",
        "rust"
    );
    const rustLibPath = path.join(
        nativeLibPath,
        "target",
        target,
        "release",
        `lib${nativeLibDir}.a`
    );
    const rustHeadersPath = path.join(
        nativeLibPath,
        `${nativeLibDir}.h`
    );

    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
    }

    if (!fs.existsSync(rustLibPath)) {
        console.error(`Library file not found: ${rustLibPath}`);
        process.exit(1);
    }

    fs.copyFileSync(rustLibPath, path.join(destinationPath, `lib${nativeLibDir}.a`));
    fs.copyFileSync(rustHeadersPath, path.join(destinationPath, `${nativeLibDir}.h`));
}

function main() {
    const target = TARGETS[getTarget()];

    MODULES.forEach((module) => {
        buildModule(module, target);
    });
}

main();