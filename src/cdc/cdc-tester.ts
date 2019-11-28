import { AxiosInstance, AxiosResponse } from 'axios'
import { TestConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import chalk from 'chalk'
import { MapToProblem } from '../messages'
import { DetailedProblem } from '../types'

export default class CDCTester {
  constructor(
    private readonly loader: AxiosInstance,
    private readonly typeValidator: TypeValidator,
    private readonly mapToProblem: MapToProblem,
  ) {}

  public async test({
    request: { endpoint, method },
    response: responseConfig,
  }: TestConfig): Promise<DetailedProblem[] | string> {
    const problems: DetailedProblem[] = []

    let response: AxiosResponse
    try {
      response = await this.getResponse(endpoint, method)
    } catch (err) {
      const errorResponse = err.response as AxiosResponse

      if (!errorResponse) {
        return `No response from ${chalk.underline(endpoint)}`
      }

      if (responseConfig.code !== errorResponse.status) {
        return `Expected status ${chalk.green(responseConfig.code)} but received ${chalk.red(
          errorResponse.status,
        )}`
      }

      response = errorResponse
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
      problems.push(this.mapToProblem('status', responseConfig.code, response.status))
    }

    if (responseConfig.body && response.data !== responseConfig.body) {
      problems.push(this.mapToProblem('body', responseConfig.body, response.data))
    }

    if (responseConfig.type) {
      const result = this.typeValidator.getValidationErrors(response.data, responseConfig.type)
      if (result) typeof result === 'string' ? problems.push(result) : problems.push(...result)
    }

    return problems
  }

  private async getResponse(endpoint: string, method: 'GET'): Promise<AxiosResponse> {
    switch (method) {
      case 'GET':
        return await this.loader.get(endpoint)
    }
  }
}