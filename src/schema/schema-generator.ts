import { SchemaRetriever } from './types'
import type { Program } from 'typescript'
import { ReportMetric } from '~commands/shared'
import {
  SchemaGenerator as TsSchemaGenerator,
  createParser,
  createFormatter,
  Config,
  NoRootTypeError,
} from 'ts-json-schema-generator'
import { JSONSchema7 } from 'json-schema'
import { NcdcLogger } from '~logger'

type JsonSchemaGenerator = (type: string) => JSONSchema7

export class SchemaGenerator implements SchemaRetriever {
  private readonly cache = new Map<string, JSONSchema7>()
  private generateJsonSchema?: JsonSchemaGenerator

  constructor(
    private readonly program: Program,
    private readonly skipTypeChecking: boolean,
    private readonly reportMetric: ReportMetric,
    private readonly logger: NcdcLogger,
  ) {}

  public init(): void {
    this.generateJsonSchema = this.createGenerator(this.program)
  }

  public load = async (symbolName: string): Promise<JSONSchema7> => {
    const { success, fail } = this.reportMetric(`load schema for ${symbolName}`)
    const cachedSchema = this.cache.get(symbolName)
    if (cachedSchema) {
      success()
      return cachedSchema
    }

    if (!this.generateJsonSchema) {
      fail()
      throw new Error('This SchemaGenerator instance has not been initialised')
    }

    try {
      const schema = this.generateJsonSchema(symbolName)
      this.cache.set(symbolName, schema)
      success()
      return Promise.resolve(schema)
    } catch (err) {
      fail()
      if (err instanceof NoRootTypeError) {
        throw new Error(`Could not find type: ${symbolName}`)
      }

      throw new Error(`Could not create a schema for type: ${symbolName}\n${err.message}`)
    }
  }

  private createGenerator(program: Program): JsonSchemaGenerator {
    const { success } = this.reportMetric('build a schema generator')
    const config: Config = { skipTypeCheck: true, expose: 'all', additionalProperties: true }
    const generator = new TsSchemaGenerator(
      program,
      createParser(program, config),
      createFormatter(config),
      config,
    )

    success()
    return generator.createSchema.bind(generator)
  }
}
