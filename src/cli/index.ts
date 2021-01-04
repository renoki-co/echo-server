import { Cli } from './cli';

let cli = new Cli();

let yargs = require('yargs')
    .usage('Usage: laravel-echo-server <command> [options]')
    .command('start', 'Starts the server.', yargs => cli.start(yargs))
    .demandCommand(1, 'Please provide a valid command.')
    .help('help')
    .alias('help', 'h');

yargs.$0 = '';

let argv = yargs.argv;
