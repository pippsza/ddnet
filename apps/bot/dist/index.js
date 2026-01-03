import { getMode, listModes } from './modes/index.js';
// Get mode from environment or CLI argument
const modeName = process.env.BOT_MODE || process.argv[2] || 'verification';
// Handle help command
if (modeName === '--help' || modeName === '-h') {
    console.log('DDNet Bingo Bot - Multi-mode Teeworlds bot\n');
    console.log('Usage: BOT_MODE=<mode> node index.js');
    console.log('       node index.js <mode>\n');
    console.log('Available modes:');
    for (const m of listModes()) {
        console.log(`\n  ${m.name}`);
        console.log(`    ${m.description}`);
        console.log(`    Required env: ${m.requiredEnv.join(', ')}`);
    }
    console.log('\nExample:');
    console.log('  BOT_MODE=verification TARGET_NICK=Player VERIFY_TOKEN=123456 ...');
    console.log('  BOT_MODE=chatbot SERVER_IP=127.0.0.1 SERVER_PORT=8303 BOT_NAME=MyBot');
    console.log('  BOT_MODE=monitor SERVER_IP=127.0.0.1 SERVER_PORT=8303');
    process.exit(0);
}
// Handle list command
if (modeName === '--list' || modeName === '-l') {
    console.log('Available modes:');
    for (const m of listModes()) {
        console.log(`  - ${m.name}: ${m.description}`);
    }
    process.exit(0);
}
// Get the mode
const mode = getMode(modeName);
if (!mode) {
    console.error(`Unknown mode: ${modeName}`);
    console.error('Run with --help to see available modes');
    process.exit(1);
}
// Now TypeScript knows mode is not null
const activeMode = mode;
// Collect config from environment
const config = {};
for (const envKey of activeMode.requiredEnv) {
    const value = process.env[envKey];
    if (value) {
        config[envKey] = value;
    }
}
// Also include optional env vars that start with BOT_ or WEBHOOK_
for (const [key, value] of Object.entries(process.env)) {
    if ((key.startsWith('BOT_') || key.startsWith('WEBHOOK_') || key === 'COMMAND_PREFIX') && value) {
        config[key] = value;
    }
}
async function main() {
    console.log(`[Bot] Starting in ${modeName} mode`);
    try {
        activeMode.init(config);
    }
    catch (error) {
        console.error('[Bot] Initialization error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
    try {
        await activeMode.run();
    }
    catch (error) {
        console.error('[Bot] Runtime error:', error);
        await activeMode.cleanup();
        process.exit(1);
    }
    await activeMode.cleanup();
    console.log('[Bot] Finished');
    process.exit(0);
}
// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Bot] Received SIGTERM, shutting down...');
    await activeMode.cleanup();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('[Bot] Received SIGINT, shutting down...');
    await activeMode.cleanup();
    process.exit(0);
});
main().catch((error) => {
    console.error('[Bot] Fatal error:', error);
    process.exit(1);
});
