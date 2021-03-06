import { randomString, mockFn, mockObj } from '~test-helpers'
import { getConfigTypes, GenerateConfig } from './config'
import { readYamlAsync } from '~io'
import { validateRawConfig } from '~config/validate'
import { red } from 'chalk'

jest.disableAutomock()
jest.mock('~io')
jest.mock('~config/validate')

describe('getConfigTypes', () => {
  function createTestDeps() {
    return {
      getConfigTypes,
      mockReadYamlAsync: mockFn(readYamlAsync),
      mockValidateRawConfig: mockFn(validateRawConfig),
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('calls readYamlAsync with the correct args for each config', async () => {
    const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })
    const configPaths = [randomString('path1'), randomString('path2')]

    await getConfigTypes(configPaths)

    expect(mockReadYamlAsync).nthCalledWith(1, configPaths[0])
    expect(mockReadYamlAsync).nthCalledWith(2, configPaths[1])
  })

  describe('config file validation', () => {
    it('validates each config with the correct args', async () => {
      const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
      const configPaths = [randomString('path1'), randomString('path2')]
      const config1 = { name: 'hello' }
      const config2 = { name: 'world' }
      mockReadYamlAsync.mockResolvedValueOnce(config1).mockResolvedValueOnce(config2)
      mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })

      await getConfigTypes(configPaths)

      expect(mockValidateRawConfig).nthCalledWith(1, config1)
      expect(mockValidateRawConfig).nthCalledWith(2, config2)
    })

    it("throws an error containing the details of each config's validation failures", async () => {
      const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
      const configPaths = ['path1', randomString('path2'), 'path3']
      mockReadYamlAsync.mockResolvedValue({ hello: 'world' })

      mockValidateRawConfig
        .mockReturnValueOnce({ success: false, errors: ['whoopsie', 'daisy'] })
        .mockReturnValueOnce({ success: true, validatedConfigs: [] })
        .mockReturnValueOnce({ success: false, errors: ['oh no!'] })

      await expect(getConfigTypes(configPaths)).rejects.toThrow(
        `${red('Invalid config file - path1')}\nwhoopsie\ndaisy\n\n${red(
          'Invalid config file - path3',
        )}\noh no!`,
      )
    })
  })

  it('can return a list of types', async () => {
    const { getConfigTypes, mockValidateRawConfig } = createTestDeps()
    const configPaths = [randomString('path1'), randomString('path2')]
    const createConfig = (reqType?: string, resType?: string): GenerateConfig =>
      mockObj<GenerateConfig>({ request: { type: reqType }, response: { type: resType } })
    mockValidateRawConfig
      .mockReturnValueOnce({
        success: true,
        validatedConfigs: [createConfig('RType'), createConfig(undefined, 'Delta')],
      })
      .mockReturnValueOnce({
        success: true,
        validatedConfigs: [createConfig(undefined, 'Doom'), createConfig('Machine', 'Guns')],
      })

    const result = await getConfigTypes(configPaths)

    expect(result).toStrictEqual(['RType', 'Delta', 'Doom', 'Machine', 'Guns'])
  })
})
