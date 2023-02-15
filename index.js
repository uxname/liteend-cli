#! /usr/bin/env node
const {program} = require('commander');
const {spawnSync} = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const Colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
}

function colorPrint(color, text) {
    console.log(color, text, Colors.reset);
}

function spawnCommand(command) {
    spawnSync(command, {shell: true, stdio: 'inherit'});
}

function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function parseDotEnvFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const result = {};
    for (const line of lines) {
        if (!line
            || line.startsWith('#')
            || !line.includes('=')
            || line.startsWith(' ')
            || line.startsWith('\t')
            || line === '') {
            continue;
        }
        const separatorIndex = line.indexOf('=');
        const key = line.substring(0, separatorIndex);
        result[key] = line.substring(separatorIndex + 1);
    }
    return result;
}

function objectToDotEnvString(object) {
    return Object.entries(object).map(([key, value]) => `${key}=${value}`).join('\n');
}

function writeNewKeys(projectRootDirectory) {
    // copy .env.sample to .env
    fs.copyFileSync(`${projectRootDirectory}/.env.sample`, `${projectRootDirectory}/.env`);

    const envObj = parseDotEnvFile(`${projectRootDirectory}/.env`);

    const SECRET_FIELDS = [
        'SALT',
        'LOGS_ADMIN_PANEL_PASSWORD',
        'DATABASE_PASSWORD'
    ]

    for (const field of SECRET_FIELDS) {
        envObj[field] = generateRandomString(64);
    }

    const env = objectToDotEnvString(envObj);
    fs.writeFileSync(`${projectRootDirectory}/.env`, env, 'utf8');
}

async function main(projectName, options) {
    if (!projectName) {
        colorPrint(Colors.red, 'Project name is required!');
        return;
    }
    colorPrint(Colors.green, 'Welcome to LiteEnd CLI!');

    colorPrint(Colors.blue, `Creating project "${projectName}"`);
    colorPrint(Colors.blue, `Cloning repository...`);
    spawnCommand(`git clone https://github.com/uxname/liteend.git ${projectName}`);
    colorPrint(Colors.blue, `Repository cloned!`);

    colorPrint(Colors.blue, `Installing dependencies...`);
    spawnCommand(`cd ${projectName} && npm install --legacy-peer-deps`);
    colorPrint(Colors.blue, `Dependencies installed!`);

    if (options.gen) {
        colorPrint(Colors.blue, `Generating .env keys`);
        writeNewKeys(projectName);
        spawnCommand(`cd ${projectName} && npm run db:gen`);
        colorPrint(Colors.blue, `Keys generated!`);
    }

    if (options.git) {
        colorPrint(Colors.blue, `Setting git remote...`);
        spawnCommand(`cd ${projectName} && git remote set-url origin ${options.git}`);
        colorPrint(Colors.blue, `Git remote set to ${options.git}!`);
    }

    colorPrint(Colors.green, `Project created!`);
}

program
    .command('new <project-name>')
    .description('Create a new project')
    .option('--gen [boolean]', 'Generate keys in .env file', true)
    .option('--git [string]', 'Set git url')
    .action(main);

program.parse();

