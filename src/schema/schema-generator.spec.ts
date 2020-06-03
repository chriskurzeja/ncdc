import { SchemaGenerator } from './schema-generator'
import * as TJS from 'typescript-json-schema'
import ts from 'typescript'
import { mockObj, randomString, mockFn } from '~test-helpers'
import * as tsHelpers from './ts-helpers'
import { ReportOperation } from '~commands/shared'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')
jest.mock('path')
jest.mock('fs')
jest.mock('./ts-helpers')

describe('SchemaLoader', () => {
  const mockedTJS = mockObj(TJS)
  const mockedTJSGenerator = mockObj<TJS.JsonSchemaGenerator>({ getSchemaForSymbol: jest.fn() })
  const mockedTypescript = mockObj(ts)
  const mockedTsHelpers = mockObj(tsHelpers)
  const mockedReportOperation = mockFn<ReportOperation>()

  beforeEach(() => {
    jest.resetAllMocks()
    mockedTypescript.parseJsonConfigFileContent.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
    mockedTypescript.createProgram.mockReturnValue(mockObj<ts.Program>({}))
    mockedTypescript.getPreEmitDiagnostics.mockReturnValue([])
    mockedTJS.buildGenerator.mockReturnValue(mockedTJSGenerator)
    mockedTsHelpers.readTsConfig.mockReturnValue({} as ts.ParsedCommandLine)
    mockedTsHelpers.formatErrorDiagnostic.mockImplementation(({ messageText }) =>
      typeof messageText === 'string' ? messageText : 'poop',
    )

    mockedReportOperation.mockReturnValue({ fail: jest.fn(), success: jest.fn() })
  })

  describe('when a tsconfig path is given', () => {
    it('throws when there are errors and skipTypeChecking is false', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([
        mockObj<ts.Diagnostic>({ messageText: 'woah' }),
      ])

      const schemaLoader = new SchemaGenerator('', false, mockedReportOperation)

      expect(() => schemaLoader.init()).toThrowError('woah')
    })

    it.todo('does not throw when there are errors and skipTypeChecking is true')
  })

  it('calls read ts config with the correct args', () => {
    const tsconfigPath = randomString('tsconfig path')

    new SchemaGenerator(tsconfigPath, false, mockedReportOperation).init()

    expect(mockedTsHelpers.readTsConfig).toBeCalledWith(tsconfigPath)
  })

  describe('creating a tsj generator', () => {
    it('creates a generator with the correct args', () => {
      const dummyProgram = mockObj<ts.Program>({})
      mockedTypescript.createProgram.mockReturnValue(dummyProgram)

      new SchemaGenerator('', false, mockedReportOperation).init()

      // we don't need TSJ to check for errors because we do it ourself
      expect(mockedTJS.buildGenerator).toBeCalledWith(dummyProgram, {
        required: true,
        ignoreErrors: true,
      })
    })

    it('throws an error if no generator is returned', () => {
      mockedTJS.buildGenerator.mockReturnValue(null)

      const schemaLoader = new SchemaGenerator('tsconfig path', true, mockedReportOperation)

      expect(() => schemaLoader.init()).toThrowError('Could not get types from your typescript project')
    })
  })

  describe('loading schemas', () => {
    it('throws if there is no generator', async () => {
      const schemaGenerator = new SchemaGenerator('tsconfig path', true, mockedReportOperation)

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('returns the generated schema', async () => {
      const someSchema = { $schema: 'schema stuff' }
      mockedTJSGenerator.getSchemaForSymbol.mockReturnValue(someSchema)

      const schemaLoader = new SchemaGenerator('tsconfig path', true, mockedReportOperation)
      schemaLoader.init()
      const schema = await schemaLoader.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      mockedTJSGenerator.getSchemaForSymbol.mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2)

      const schemaLoader = new SchemaGenerator('tsconfig path', true, mockedReportOperation)
      schemaLoader.init()
      const schema1 = await schemaLoader.load('DealSchema')
      const schema2 = await schemaLoader.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedTJSGenerator.getSchemaForSymbol).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
