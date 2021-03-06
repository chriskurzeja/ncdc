import mainYargs from 'yargs'
import { createGenerateCommand, createServeCommand, createTestCommand } from './commands'
import { opts } from './commands'
import MetricsReporter from '~metrics'
import createNcdcLogger from '~logger'
import { GetRootDeps } from '~commands/shared'

export default function run(): void {
  const getCommonDeps: GetRootDeps = (verbose) => {
    const logger = createNcdcLogger(verbose)
    const metrics = new MetricsReporter(logger)
    const { success, fail } = metrics.report('Program')

    process.on('exit', (code) => {
      code === 0 ? success() : fail()
    })

    return {
      logger,
      reportMetric: metrics.report.bind(metrics),
      handleError: ({ message }) => {
        logger.error(message)
        process.exit(1)
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .option(opts.TSCONFIG_PATH, opts.TSCONFIG_PATH_OPTS)
    .option(opts.SCHEMA_PATH, opts.SCHEMA_PATH_OPTS)
    .option(opts.FORCE_GENERATION, opts.FORCE_GENERATION_OPTS)
    .option(opts.VERBOSE, opts.VERBOSE_OPTS)
    .command(createGenerateCommand(getCommonDeps))
    .command(createServeCommand(getCommonDeps))
    .command(createTestCommand(getCommonDeps))
    .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(opts.EXAMPLE_SERVE_COMMAND, opts.EXAMPLE_SERVE_DESCRIPTION)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
