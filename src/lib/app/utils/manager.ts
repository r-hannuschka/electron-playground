
import { spawn } from "child_process";
import cliProgress from 'cli-progress';
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from "readline";
import { inject, InjectionToken, singleton } from 'tsyringe';
import { Extract } from "unzipper";

export const ELECTRON_INSTALL_PATH: InjectionToken<string> = Symbol(`electron download path`);
export const ELECTRON_VERSION: InjectionToken<string> = Symbol(`electron version`);

@singleton()
export class ElectronManager {

    public constructor(
        @inject(ELECTRON_VERSION) private version: string,
        @inject(ELECTRON_INSTALL_PATH) private installPath: string
    ) {}

    /**
     *
     *
     */
    public async install() {
        await this.downloadElectron();
        await this.unzipElectron();
        await this.finalizeInstallation();
        process.stdout.write(`completed`);
    }

    /**
     * validate electron installation
     *
     */
    public async validateInstallation() {
        const rootDir = path.resolve(__dirname, this.installPath);

        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
            return false;
        }

        const versionFilePath = path.resolve(rootDir, "version");
        if (!fs.existsSync(versionFilePath)) {
            return false;
        }

        const version = await this.readElectronVersion();
        return version === this.version;
    }

    public start() {
        const electronApp = path.resolve(__dirname, 'electron-main.js');
        const electronDistPath = path.resolve(__dirname, this.installPath);

        spawn(`node`, [electronApp], {
            env: {
                ELECTRON_OVERRIDE_DIST_PATH: electronDistPath
            }
        });
    }

    /**
     * get current electron version
     *
     */
    private async readElectronVersion(): Promise<string | null> {

        return new Promise((resolve, reject) => {
            const versionFile = path.resolve(__dirname, this.installPath, 'version');

            if (!fs.existsSync(versionFile) || fs.statSync(versionFile).isFile) {
                return null;
            }

            const rs = fs.createReadStream(versionFile, {encoding: 'utf8'});
            const line = readline.createInterface(rs);

            line.on("line", (version) => resolve(version));
        });

    }

    /**
     * download electron binary from github
     *
     */
    private async downloadElectron(): Promise<void> {

        process.stdout.write(`Start download from: ${this.resolveDownloadUrl()} ${os.EOL}`);

        const download    = await fetch(this.resolveDownloadUrl());
        const filename    = `electron.zip`
        const fileStream  = fs.createWriteStream(path.join(__dirname, this.installPath, filename), {flags: 'wx' });
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        const totalSize   = parseInt(download.headers.get('content-length') ?? '', 10);

        let progress = 0;

        progressBar.start(totalSize, 0);

        download.body.pipe(fileStream);
        download.body.on('data', (chunk: Buffer) => {
            progress += chunk.byteLength;
            progressBar.update(progress);
        });

        return new Promise((resolve) => {
            fileStream.on('close', () => {
                progressBar.stop();
                resolve();
            });
        });
    }

    private async finalizeInstallation(): Promise<void> {

        return new Promise((resolve, reject) => {
            const pathTxt = path.resolve(__dirname, 'path.txt');
            const pathTxt$ = fs.createWriteStream(pathTxt);

            let electronPath = ``;

            switch (os.platform()) {
                case 'darwin':
                    electronPath = `Electron.app/Contents/MacOS/Electron`;
                    break;
            }

            /** executable path */
            pathTxt$.write(electronPath + os.EOL);
            pathTxt$.close();
            resolve();
        })
    }

    /**
     * build download url for electron
     * 
     */
    private resolveDownloadUrl(): string {
        const baseUrl = `https://github.com/electron/electron/releases/download`;
        const downloadFile = `electron-v${this.version}-${os.platform()}-x64.zip`;
        return baseUrl + '/v' + this.version + '/' + downloadFile;
    }

    /**
     * extract electron.zip
     *
     */
    private async unzipElectron(): Promise<void> {

        const archivePath = path.resolve(__dirname, this.installPath, `electron.zip`);
        const outPath     = path.resolve(__dirname, this.installPath);

        const unzip$ = fs.createReadStream(archivePath)
            .pipe(Extract({ path: outPath }));

        unzip$.on("close", () => fs.unlinkSync(archivePath));
    }
}
