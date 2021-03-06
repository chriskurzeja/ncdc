import { readJsonAsync } from '~io'
import type { Definition } from 'ts-json-schema-generator'
import type { SchemaRetriever } from './types'

export class FsSchemaLoader implements SchemaRetriever {
  private readonly cache: { [symbol: string]: Definition } = {}

  constructor(private readonly schemaPath: string) {}

  public async load(symbolName: string): Promise<Definition> {
    return (
      this.cache[symbolName] ??
      (this.cache[symbolName] = await readJsonAsync(`${this.schemaPath}/${symbolName}.json`))
    )
  }
}
